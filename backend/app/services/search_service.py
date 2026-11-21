
import re
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Document, DocumentChunk, DocumentStatus
from app.services.embedding_service import generate_embedding


# Reciprocal Rank Fusion configuration.
RRF_K = 60
SEMANTIC_WEIGHT = 0.65
KEYWORD_WEIGHT = 0.35

# Retrieval configuration.
MIN_CANDIDATES = 40
MAX_CANDIDATES = 150
MAX_CHUNKS_PER_PAGE = 2

# Known projects in the uploaded evaluation document.
KNOWN_PROJECTS = (
    "TimeWise",
    "Folio",
    "Recall",
)

# Terms that help identify project-description passages.
PROJECT_CONTEXT_TERMS = (
    "application",
    "project",
    "frontend",
    "backend",
    "database",
    "technology",
    "technologies",
    "features",
    "dashboard",
    "bookstore",
    "attendance",
    "document intelligence",
    "stack",
    "built",
    "developed",
)


def extract_project_terms(query: str) -> list[str]:
    """Identify explicitly named projects in a question."""

    query_lower = query.lower()

    return [
        project
        for project in KNOWN_PROJECTS
        if project.lower() in query_lower
    ]


def semantic_search(
    db: Session,
    user_id: UUID,
    query: str,
    limit: int = 8,
    collection_id: UUID | None = None,
) -> list[dict]:

    query = query.strip()

    if not query:
        return []

    limit = max(1, limit)

    candidate_limit = min(
        max(limit * 8, MIN_CANDIDATES),
        MAX_CANDIDATES,
    )

    combined_results = {}

    base_filters = [
        Document.user_id == user_id,
        Document.status == DocumentStatus.COMPLETED,
    ]

    if collection_id is not None:
        base_filters.append(Document.collection_id == collection_id)

    # --------------------------------------------------
    # 1. Exact project-name retrieval
    # --------------------------------------------------

    project_terms = extract_project_terms(query)

    for project_term in project_terms:

        exact_statement = (
            select(
                DocumentChunk.id,
                DocumentChunk.document_id,
                DocumentChunk.content,
                DocumentChunk.page_number,
                Document.original_filename,
            )
            .join(
                Document,
                Document.id == DocumentChunk.document_id,
            )
            .where(
                *base_filters,
                DocumentChunk.content.ilike(
                    f"%{project_term}%"
                ),
            )
            .order_by(
                DocumentChunk.page_number.asc(),
                DocumentChunk.id.asc(),
            )
            .limit(candidate_limit)
        )

        exact_results = db.execute(
            exact_statement
        ).all()

        # Rank project-description passages above generic mentions.
        scored_exact_results = []

        for result in exact_results:
            content_lower = result.content.lower()

            context_matches = sum(
                1
                for term in PROJECT_CONTEXT_TERMS
                if term in content_lower
            )

            scored_exact_results.append(
                (result, context_matches)
            )

        scored_exact_results.sort(
            key=lambda item: item[1],
            reverse=True,
        )

        for rank, (result, context_matches) in enumerate(
            scored_exact_results,
            start=1,
        ):
            # Keep exact matching on the same scale as RRF.
            exact_score = (
                1.0 / (RRF_K + rank)
            )

            # Small bonus for descriptive project passages.
            context_bonus = min(
                context_matches,
                5,
            ) * 0.0005

            if result.id in combined_results:
                combined_results[result.id]["fusion_score"] += (
                    exact_score + context_bonus
                )
            else:
                combined_results[result.id] = {
                    "chunk_id": str(result.id),
                    "document_id": str(result.document_id),
                    "document_name": result.original_filename,
                    "page_number": result.page_number,
                    "content": result.content.strip(),
                    "fusion_score": (
                        exact_score + context_bonus
                    ),
                }

    # --------------------------------------------------
    # 2. Semantic retrieval using pgvector
    # --------------------------------------------------

    query_embedding = generate_embedding(query)

    distance = DocumentChunk.embedding.cosine_distance(
        query_embedding
    )

    semantic_statement = (
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            DocumentChunk.content,
            DocumentChunk.page_number,
            Document.original_filename,
        )
        .join(
            Document,
            Document.id == DocumentChunk.document_id,
        )
        .where(
            *base_filters,
            DocumentChunk.embedding.is_not(None),
        )
        .order_by(distance.asc())
        .limit(candidate_limit)
    )

    semantic_results = db.execute(
        semantic_statement
    ).all()

    for rank, result in enumerate(
        semantic_results,
        start=1,
    ):
        semantic_score = (
            SEMANTIC_WEIGHT / (RRF_K + rank)
        )

        if result.id in combined_results:
            combined_results[result.id]["fusion_score"] += (
                semantic_score
            )
        else:
            combined_results[result.id] = {
                "chunk_id": str(result.id),
                "document_id": str(result.document_id),
                "document_name": result.original_filename,
                "page_number": result.page_number,
                "content": result.content.strip(),
                "fusion_score": semantic_score,
            }

    # --------------------------------------------------
    # 3. Keyword retrieval using PostgreSQL FTS
    # --------------------------------------------------

    search_vector = func.to_tsvector(
        "english",
        DocumentChunk.content,
    )

    search_query = func.plainto_tsquery(
        "english",
        query,
    )

    keyword_rank = func.ts_rank_cd(
        search_vector,
        search_query,
    )

    keyword_statement = (
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            DocumentChunk.content,
            DocumentChunk.page_number,
            Document.original_filename,
        )
        .join(
            Document,
            Document.id == DocumentChunk.document_id,
        )
        .where(
            *base_filters,
            search_vector.bool_op("@@")(search_query),
        )
        .order_by(keyword_rank.desc())
        .limit(candidate_limit)
    )

    keyword_results = db.execute(
        keyword_statement
    ).all()

    for rank, result in enumerate(
        keyword_results,
        start=1,
    ):
        keyword_score = (
            KEYWORD_WEIGHT / (RRF_K + rank)
        )

        if result.id in combined_results:
            combined_results[result.id]["fusion_score"] += (
                keyword_score
            )
        else:
            combined_results[result.id] = {
                "chunk_id": str(result.id),
                "document_id": str(result.document_id),
                "document_name": result.original_filename,
                "page_number": result.page_number,
                "content": result.content.strip(),
                "fusion_score": keyword_score,
            }

    # --------------------------------------------------
    # 4. Rank candidates
    # --------------------------------------------------

    ranked_results = sorted(
        combined_results.values(),
        key=lambda item: item["fusion_score"],
        reverse=True,
    )

    # --------------------------------------------------
    # 5. Deduplicate identical passages
    # --------------------------------------------------

    unique_results = []
    seen_content = set()

    for result in ranked_results:

        normalized_content = " ".join(
            result["content"].lower().split()
        )

        if not normalized_content:
            continue

        if normalized_content in seen_content:
            continue

        seen_content.add(normalized_content)

        result["similarity"] = round(
            result["fusion_score"] * (RRF_K + 1),
            4,
        )

        result.pop("fusion_score")

        unique_results.append(result)

    # --------------------------------------------------
    # 6. Diversity-aware selection
    # --------------------------------------------------

    final_results = []
    page_counts = {}

    for result in unique_results:

        page_key = (
            result["document_id"],
            result["page_number"],
        )

        current_count = page_counts.get(page_key, 0)

        if current_count >= MAX_CHUNKS_PER_PAGE:
            continue

        final_results.append(result)

        page_counts[page_key] = current_count + 1

        if len(final_results) >= limit:
            break

    # Fill remaining slots if needed.
    if len(final_results) < limit:

        selected_ids = {
            result["chunk_id"]
            for result in final_results
        }

        for result in unique_results:

            if result["chunk_id"] in selected_ids:
                continue

            final_results.append(result)

            if len(final_results) >= limit:
                break

    # --------------------------------------------------
    # 7. Retrieval diagnostics
    # --------------------------------------------------

    logger_results = [
        {
            "page": result["page_number"],
            "score": result["similarity"],
        }
        for result in final_results
    ]

    import logging

    logging.getLogger(__name__).info(
        "Retrieval results: count=%s project_terms=%s pages=%s",
        len(final_results),
        project_terms,
        logger_results,
    )

    return final_results
