
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Document, DocumentChunk, DocumentStatus
from app.services.embedding_service import generate_embedding


def semantic_search(
    db: Session,
    user_id: UUID,
    query: str,
    limit: int = 5,
) -> list[dict]:
    query_embedding = generate_embedding(query)

    distance = DocumentChunk.embedding.cosine_distance(query_embedding)

    statement = (
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            DocumentChunk.content,
            DocumentChunk.page_number,
            Document.original_filename,
            distance.label("distance"),
        )
        .join(
            Document,
            Document.id == DocumentChunk.document_id,
        )
        .where(
            Document.user_id == user_id,
            DocumentChunk.embedding.is_not(None),
            Document.status == DocumentStatus.COMPLETED,
        )
        .order_by(distance.asc())
        .limit(limit)
    )

    results = db.execute(statement).all()

    return [
        {
            "chunk_id": str(result.id),
            "document_id": str(result.document_id),
            "document_name": result.original_filename,
            "page_number": result.page_number,
            "content": result.content,
            "similarity": round(1 - float(result.distance), 4),
        }
        for result in results
    ]
