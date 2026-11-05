
import re

import httpx

from app.core.config import settings


INSUFFICIENT_EVIDENCE = (
    "I couldn't find enough relevant information in your uploaded "
    "documents to answer that question reliably. Try asking about "
    "something explicitly covered in your documents."
)

CITATION_PATTERN = re.compile(r"\[(\d+)\]")


def generate_rag_answer(
    question: str,
    sources: list[dict],
    history: list[dict] | None = None,
) -> tuple[str, list[dict]]:
    """
    Generate a document-grounded answer and return only validated
    sources explicitly cited by the model.

    Returns:
        tuple[str, list[dict]]:
            Generated answer and its cited source dictionaries.
    """

    if not sources:
        return INSUFFICIENT_EVIDENCE, []

    context_parts = []

    for index, source in enumerate(sources, start=1):
        context_parts.append(
            f"""
SOURCE [{index}]
Document: {source["document_name"]}
Page: {source["page_number"]}
Content:
{source["content"]}
"""
        )

    context = "\n".join(context_parts)

    system_prompt = """
You are Recall, a document intelligence assistant.

Your job is to answer questions using ONLY the supplied document sources.

STRICT RULES:

1. Treat the supplied sources as the only factual authority.
2. Do not use outside knowledge to fill gaps.
3. Never invent facts, quotations, document names, or page numbers.
4. If the sources do not contain enough information, clearly say so.
5. Cite every factual claim using the supplied source notation:
   [1], [2], etc.
6. Only use citation numbers that actually appear in the supplied sources.
7. A citation must directly support the claim it follows.
8. Do not cite a source merely because it is available.
9. If sources disagree, explain the disagreement and cite both.
10. Be clear, direct, and reasonably concise.
11. If the evidence is insufficient, explicitly acknowledge that.

The application validates citation references and connects them
to the original documents.
"""

    messages = [
        {
            "role": "system",
            "content": system_prompt,
        }
    ]

    # Include only recent conversation context.
    for item in (history or [])[-8:]:
        if item["role"] in ("user", "assistant"):
            messages.append(
                {
                    "role": item["role"],
                    "content": item["content"],
                }
            )

    messages.append(
        {
            "role": "user",
            "content": f"""
DOCUMENT SOURCES:

{context}

QUESTION:

{question}

Answer using only the document sources above.

CITATION REQUIREMENTS:
- Cite factual claims using [1], [2], etc.
- Every factual claim must have a supporting citation.
- Never invent citation numbers.
- Do not include a bibliography or sources that you did not use.
- If the sources cannot answer the question, say so.
""",
        }
    )

    try:
        response = httpx.post(
            f"{settings.ollama_base_url.rstrip('/')}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                },
            },
            timeout=settings.ollama_timeout,
        )

        response.raise_for_status()
        data = response.json()

        answer = data.get("message", {}).get("content", "").strip()

        if not answer:
            raise RuntimeError("Ollama returned an empty response.")

        # Extract citation numbers in the order they appear.
        matches = CITATION_PATTERN.findall(answer)

        # Keep only valid, unique source indexes.
        cited_indexes = []

        for match in matches:
            source_index = int(match)

            if (
                1 <= source_index <= len(sources)
                and source_index not in cited_indexes
            ):
                cited_indexes.append(source_index)

        # An answer without valid citations cannot be trusted
        # as a grounded response.
        if not cited_indexes:
            return INSUFFICIENT_EVIDENCE, []

        # Map original source indexes to consecutive citation numbers.
        citation_mapping = {
            original_index: new_index
            for new_index, original_index in enumerate(
                cited_indexes,
                start=1,
            )
        }

        def normalize_citation(match: re.Match) -> str:
            original_index = int(match.group(1))

            if original_index not in citation_mapping:
                return ""

            return f"[{citation_mapping[original_index]}]"

        answer = CITATION_PATTERN.sub(
            normalize_citation,
            answer,
        ).strip()

        # Return sources in the same order as normalized citations.
        cited_sources = [
            sources[index - 1]
            for index in cited_indexes
        ]

        return answer, cited_sources

    except httpx.TimeoutException as exc:
        raise RuntimeError(
            "The local AI model took too long to respond. Try again."
        ) from exc

    except httpx.HTTPError as exc:
        raise RuntimeError(
            "Could not communicate with Ollama. Make sure Ollama is running."
        ) from exc
