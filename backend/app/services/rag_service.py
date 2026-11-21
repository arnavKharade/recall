
import re

import httpx

from app.core.config import settings


INSUFFICIENT_EVIDENCE = (
    "I couldn't find enough relevant information in your uploaded "
    "documents to answer that question reliably. Try asking about "
    "something explicitly covered in your documents."
)

CITATION_PATTERN = re.compile(r"\[(\d+)\]")


SYSTEM_PROMPT = """
You are Recall, an evidence-grounded document intelligence assistant.

Your job is to answer questions using ONLY the supplied document passages.

CORE RULES:

1. Never invent facts, technologies, project details, dates, or relationships.
2. Never assume a technology was used in a project just because it
   appears in a general skills inventory.
3. Associate a technology with a specific project ONLY when the
   document explicitly associates them.
4. If a project description does not specify its programming stack,
   explicitly state:
   "The document does not specify this project's programming stack."
5. Distinguish between:
   - Programming languages and frameworks
   - Databases and backend technologies
   - Design tools, fonts, and visual styling
   - General skills and technologies mentioned elsewhere
6. Design fonts such as Poppins and Inter are not programming technologies.
7. When a question names a project, prioritize passages describing
   that exact project.
8. Never use unrelated passages to fill gaps in a project's description.
9. If the documents support only part of an answer, provide that part
   and clearly identify what is unspecified.
10. Abstain only when the supplied passages contain no useful evidence.

PROJECT-SPECIFIC GROUNDING:

- A general skills list is NOT evidence that a particular project
  used those technologies.
- A technology must be explicitly associated with a project in
  the supplied passages before you can claim that the project uses it.
- If a project description lists features but no programming stack,
  explain its purpose and features, then state that its programming
  stack is not specified.
- Do not confuse design specifications with implementation details.
- Do not infer missing technologies from other projects.

CITATIONS:

- Cite factual claims using source numbers, e.g. [1].
- Use the smallest number of relevant citations necessary.
- Place citations immediately after the claims they support.
- Never cite a passage that does not support the associated claim.
- Never invent citation numbers.
- An answer about missing information should cite the relevant
  project description when available.

ANSWERING STRATEGY:

Before answering:
1. Identify the exact subject or project.
2. Locate passages describing that subject.
3. Separate explicit facts from missing information.
4. Check every project-technology association against the evidence.
5. Answer directly and concisely.

Be precise, useful, and transparent about uncertainty.
"""


def generate_rag_answer(
    question: str,
    sources: list[dict],
    history: list[dict] | None = None,
) -> tuple[str, list[dict]]:
    """
    Generate an answer grounded exclusively in supplied documents.

    Returns:
        A tuple containing:
        - The generated answer.
        - Only the validated sources cited by the model.
    """

    if not sources:
        return INSUFFICIENT_EVIDENCE, []

    # --------------------------------------------------
    # 1. Construct document context
    # --------------------------------------------------

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

    # --------------------------------------------------
    # 2. Build conversation messages
    # --------------------------------------------------

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    # Keep recent conversation context, excluding any
    # unexpected roles.
    for item in (history or [])[-6:]:
        if item.get("role") in ("user", "assistant"):
            messages.append(
                {
                    "role": item["role"],
                    "content": item["content"],
                }
            )

    # --------------------------------------------------
    # 3. Add current question and document evidence
    # --------------------------------------------------

    messages.append(
        {
            "role": "user",
            "content": f"""
DOCUMENT SOURCES:

{context}

CURRENT QUESTION:

{question}

IMPORTANT INSTRUCTIONS:

- Answer using only the supplied document sources.
- Prioritize sources directly relevant to the question.
- Do not transfer technologies or facts from one project
  to another.
- If a project's programming stack is not mentioned,
  explicitly say that it is not specified.
- Answer all parts that have sufficient evidence.
- Cite factual claims using the supplied source numbers.
- Use only relevant citations.
- Do not create a separate bibliography.

Provide a grounded, useful answer.
""",
        }
    )

    # --------------------------------------------------
    # 4. Generate answer using Ollama
    # --------------------------------------------------

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

        answer = (
            data.get("message", {})
            .get("content", "")
            .strip()
        )

        print("\n========== RAG DEBUG ==========")
        print("Sources supplied:", len(sources))
        print("Answer length:", len(answer))
        print("Citation matches:", CITATION_PATTERN.findall(answer))
        print("================================\n")

        if not answer:
            raise RuntimeError(
                "Ollama returned an empty response."
            )

        # --------------------------------------------------
        # 5. Extract and validate citation numbers
        # --------------------------------------------------

        matches = CITATION_PATTERN.findall(answer)

        cited_indexes = []

        for match in matches:
            source_index = int(match)

            if (
                1 <= source_index <= len(sources)
                and source_index not in cited_indexes
            ):
                cited_indexes.append(source_index)

        # Keep the model's useful answer if it forgot the citation syntax.
        # Attach the highest-ranked retrieved passage as a verifiable source.
        if not cited_indexes:
            if matches:
                return INSUFFICIENT_EVIDENCE, []

            cited_indexes = [1]
            answer = f"{answer.rstrip()} [1]"

        # --------------------------------------------------
        # 6. Normalize citation numbering
        # --------------------------------------------------

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

        answer = re.sub(
            r"\s+([.,;:!?])",
            r"\1",
            CITATION_PATTERN.sub(normalize_citation, answer),
        ).strip()

        # --------------------------------------------------
        # 7. Return only cited sources
        # --------------------------------------------------

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
            "Could not communicate with Ollama. "
            "Make sure Ollama is running."
        ) from exc
