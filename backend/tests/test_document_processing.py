
import pymupdf
import pytest
from sqlalchemy import select

from app.models import Document, DocumentChunk, DocumentStatus
from app.services import document_processing


def create_test_pdf(pages):
    pdf = pymupdf.open()

    for content in pages:
        page = pdf.new_page()
        page.insert_text((72, 72), content)

    result = pdf.tobytes()
    pdf.close()
    return result


def upload_pdf(client, headers, filename, content):
    return client.post(
        "/api/v1/documents/upload",
        headers=headers,
        files={"file": (filename, content, "application/pdf")},
    )


def mock_embeddings(monkeypatch):
    monkeypatch.setattr(
        document_processing,
        "generate_embeddings",
        lambda texts: [
            [0.1] * document_processing.EMBEDDING_DIMENSIONS
            for _ in texts
        ],
    )


def test_split_text_into_chunks():
    chunks = document_processing.split_text_into_chunks("A " * 2000)

    assert len(chunks) > 1
    assert all(chunks)
    assert all(
        len(chunk) <= document_processing.CHUNK_SIZE
        for chunk in chunks
    )


def test_split_text_handles_empty_content():
    assert document_processing.split_text_into_chunks("") == []
    assert document_processing.split_text_into_chunks("   \n\n   ") == []


def test_split_text_normalizes_whitespace():
    chunks = document_processing.split_text_into_chunks(
        "First    line\n\n\n\nSecond     line"
    )

    assert chunks == ["First line\n\nSecond line"]


def test_process_document_extracts_text_and_generates_embeddings(
    client, auth_headers, db_session, monkeypatch
):
    mock_embeddings(monkeypatch)

    upload = upload_pdf(
        client,
        auth_headers,
        "operations.pdf",
        create_test_pdf([
            "The dispatch lead manages daily operations.",
            "The meal allowance is 350 rupees for shifts exceeding nine hours.",
        ]),
    )

    assert upload.status_code == 201
    document_id = upload.json()["id"]

    response = client.post(
        f"/api/v1/documents/{document_id}/process",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "completed"
    assert data["page_count"] == 2
    assert data["chunks_created"] == 2
    assert data["embeddings_generated"] == 2
    assert data["embedding_dimensions"] == 384

    document = db_session.get(Document, document_id)
    assert document.status == DocumentStatus.COMPLETED
    assert document.processed_at is not None

    chunks = db_session.scalars(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document.id)
        .order_by(DocumentChunk.chunk_index)
    ).all()

    assert len(chunks) == 2
    assert chunks[0].page_number == 1
    assert chunks[1].page_number == 2

    for chunk in chunks:
        assert chunk.embedding is not None
        assert len(chunk.embedding) == 384
        assert chunk.embedding_model == document_processing.MODEL_NAME


def test_process_document_rejects_missing_document(client, auth_headers):
    response = client.post(
        "/api/v1/documents/00000000-0000-0000-0000-000000000000/process",
        headers=auth_headers,
    )

    assert response.status_code == 404


def test_process_document_requires_authentication(client):
    response = client.post(
        "/api/v1/documents/00000000-0000-0000-0000-000000000000/process"
    )

    assert response.status_code == 401


def test_process_document_marks_invalid_pdf_as_failed(
    client, auth_headers, db_session, monkeypatch
):
    mock_embeddings(monkeypatch)

    upload = upload_pdf(
        client,
        auth_headers,
        "invalid-content.pdf",
        b"%PDF-1.4\nThis is not a valid PDF document.",
    )

    assert upload.status_code == 201
    document_id = upload.json()["id"]

    response = client.post(
        f"/api/v1/documents/{document_id}/process",
        headers=auth_headers,
    )

    assert response.status_code == 422

    document = db_session.get(Document, document_id)
    assert document.status == DocumentStatus.FAILED
    assert document.error_message


def test_failed_reprocessing_preserves_existing_chunks(
    client, auth_headers, db_session, monkeypatch
):
    mock_embeddings(monkeypatch)

    upload = upload_pdf(
        client,
        auth_headers,
        "reprocess.pdf",
        create_test_pdf(["Original document content."]),
    )

    assert upload.status_code == 201
    document_id = upload.json()["id"]

    first_response = client.post(
        f"/api/v1/documents/{document_id}/process",
        headers=auth_headers,
    )

    assert first_response.status_code == 200

    original_chunks = db_session.scalars(
        select(DocumentChunk).where(
            DocumentChunk.document_id == document_id
        )
    ).all()

    assert len(original_chunks) == 1
    original_chunk_id = original_chunks[0].id

    def fail_embeddings(texts):
        raise RuntimeError("Simulated embedding failure.")

    monkeypatch.setattr(
        document_processing,
        "generate_embeddings",
        fail_embeddings,
    )

    second_response = client.post(
        f"/api/v1/documents/{document_id}/process",
        headers=auth_headers,
    )

    assert second_response.status_code == 422

    remaining_chunks = db_session.scalars(
        select(DocumentChunk).where(
            DocumentChunk.document_id == document_id
        )
    ).all()

    assert len(remaining_chunks) == 1
    assert remaining_chunks[0].id == original_chunk_id

    document = db_session.get(Document, document_id)
    assert document.status == DocumentStatus.FAILED
