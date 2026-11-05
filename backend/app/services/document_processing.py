
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

import pymupdf
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import Document, DocumentChunk, DocumentStatus
from app.services.document_storage import get_stored_file_path
from app.services.embedding_service import (
    EMBEDDING_DIMENSIONS,
    MODEL_NAME,
    generate_embeddings,
)


CHUNK_SIZE = 1200
CHUNK_OVERLAP = 150
EMBEDDING_BATCH_SIZE = 32


def split_text_into_chunks(text: str) -> list[str]:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))

        if end < len(text):
            boundary = max(
                text.rfind(" ", start + CHUNK_SIZE // 2, end),
                text.rfind("\n", start + CHUNK_SIZE // 2, end),
            )

            if boundary > start:
                end = boundary

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = max(end - CHUNK_OVERLAP, start + 1)

    return chunks


def process_document(
    db: Session,
    document_id: UUID,
    user_id: UUID,
) -> dict:
    document = db.get(Document, document_id)

    if document is None or document.user_id != user_id:
        return {"error": "Document not found.", "not_found": True}

    document.status = DocumentStatus.PROCESSING
    document.error_message = None
    document.processed_at = None
    db.commit()

    try:
        file_path: Path = get_stored_file_path(document.storage_key)

        if not file_path.is_file():
            raise ValueError("The stored PDF file could not be found.")

        page_texts = []

        with pymupdf.open(file_path) as pdf:
            if pdf.is_encrypted:
                raise ValueError(
                    "Password-protected PDFs are not supported."
                )

            page_count = len(pdf)

            if page_count == 0:
                raise ValueError("The PDF contains no pages.")

            for page_number, page in enumerate(pdf, start=1):
                page_text = page.get_text("text").strip()

                if page_text:
                    page_texts.append((page_number, page_text))

        if not page_texts:
            raise ValueError(
                "No extractable text was found. "
                "This PDF may contain scanned images."
            )

        chunk_records = []
        chunk_index = 0

        for page_number, page_text in page_texts:
            for content in split_text_into_chunks(page_text):
                chunk_records.append(
                    DocumentChunk(
                        document_id=document.id,
                        chunk_index=chunk_index,
                        content=content,
                        page_number=page_number,
                        metadata_={},
                    )
                )

                chunk_index += 1

        if not chunk_records:
            raise ValueError("No text chunks could be generated.")

        # Generate embeddings in batches.
        for start in range(
            0,
            len(chunk_records),
            EMBEDDING_BATCH_SIZE,
        ):
            batch = chunk_records[
                start:start + EMBEDDING_BATCH_SIZE
            ]

            embeddings = generate_embeddings(
                [chunk.content for chunk in batch]
            )

            for chunk, embedding in zip(batch, embeddings):
                chunk.embedding = embedding
                chunk.embedding_model = MODEL_NAME

        # Replace previously extracted chunks only after
        # successful extraction and embedding generation.
        db.execute(
            delete(DocumentChunk).where(
                DocumentChunk.document_id == document.id
            )
        )

        db.add_all(chunk_records)

        document.page_count = page_count
        document.status = DocumentStatus.COMPLETED
        document.error_message = None
        document.processed_at = datetime.now(timezone.utc)

        db.commit()

        return {
            "document_id": str(document.id),
            "page_count": page_count,
            "chunks_created": len(chunk_records),
            "embeddings_generated": len(chunk_records),
            "embedding_dimensions": 384,
            "embedding_model": MODEL_NAME,
            "status": document.status.value,
        }

    except Exception as exc:
        db.rollback()

        failed_document = db.get(Document, document_id)

        if failed_document is not None:
            failed_document.status = DocumentStatus.FAILED
            failed_document.error_message = str(exc)[:2000]
            failed_document.processed_at = datetime.now(timezone.utc)
            db.commit()

        return {
            "document_id": str(document_id),
            "status": DocumentStatus.FAILED.value,
            "error": str(exc),
        }
