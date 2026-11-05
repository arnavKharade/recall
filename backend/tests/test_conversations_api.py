
from sqlalchemy import select

from app.api.routes import conversation as conversation_routes
from app.models import Document, DocumentChunk, DocumentStatus, User


def test_ask_question_without_evidence(
    client,
    auth_headers,
    monkeypatch,
):
    monkeypatch.setattr(
        conversation_routes,
        "semantic_search",
        lambda **kwargs: [],
    )

    response = client.post(
        "/api/v1/conversations/ask",
        headers=auth_headers,
        json={"question": "What is the annual revenue?"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["conversation_id"]
    assert data["user_message"]["role"] == "user"

    assistant = data["assistant_message"]

    assert assistant["role"] == "assistant"
    assert assistant["content"] == (
        conversation_routes.INSUFFICIENT_EVIDENCE
    )
    assert assistant["citations"] == []


def test_ask_question_persists_valid_citation(
    client,
    auth_headers,
    db_session,
    monkeypatch,
):
    user = db_session.scalar(
        select(User).where(User.email == "testuser@example.com")
    )
    assert user is not None

    document = Document(
        user_id=user.id,
        original_filename="operations.pdf",
        storage_key="test/operations.pdf",
        mime_type="application/pdf",
        size_bytes=100,
        status=DocumentStatus.COMPLETED,
    )

    db_session.add(document)
    db_session.flush()

    chunk = DocumentChunk(
        document_id=document.id,
        chunk_index=0,
        content="The meal allowance is ₹350 for shifts exceeding 9 hours.",
        page_number=3,
    )

    db_session.add(chunk)
    db_session.flush()

    source = {
        "chunk_id": str(chunk.id),
        "document_id": str(document.id),
        "document_name": document.original_filename,
        "page_number": 3,
        "content": chunk.content,
        "similarity": 0.85,
    }

    monkeypatch.setattr(
        conversation_routes,
        "semantic_search",
        lambda **kwargs: [source],
    )

    monkeypatch.setattr(
        conversation_routes,
        "generate_rag_answer",
        lambda **kwargs: (
            "The meal allowance is ₹350 [1].",
            [source],
        ),
    )

    response = client.post(
        "/api/v1/conversations/ask",
        headers=auth_headers,
        json={"question": "What is the meal allowance?"},
    )

    assert response.status_code == 200

    assistant = response.json()["assistant_message"]

    assert assistant["content"] == "The meal allowance is ₹350 [1]."
    assert assistant["model_name"] == conversation_routes.settings.ollama_model

    assert len(assistant["citations"]) == 1

    citation = assistant["citations"][0]

    assert citation["document_name"] == "operations.pdf"
    assert citation["page_number"] == 3
    assert citation["citation_order"] == 1
    assert citation["quoted_text"] == chunk.content


def test_list_conversations(client, auth_headers, monkeypatch):
    monkeypatch.setattr(
        conversation_routes,
        "semantic_search",
        lambda **kwargs: [],
    )

    created = client.post(
        "/api/v1/conversations/ask",
        headers=auth_headers,
        json={"question": "Tell me about the policy."},
    )

    assert created.status_code == 200

    response = client.get(
        "/api/v1/conversations",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == created.json()["conversation_id"]


def test_get_conversation_with_messages(
    client,
    auth_headers,
    monkeypatch,
):
    monkeypatch.setattr(
        conversation_routes,
        "semantic_search",
        lambda **kwargs: [],
    )

    created = client.post(
        "/api/v1/conversations/ask",
        headers=auth_headers,
        json={"question": "Tell me about the policy."},
    )

    conversation_id = created.json()["conversation_id"]

    response = client.get(
        f"/api/v1/conversations/{conversation_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == conversation_id
    assert len(data["messages"]) == 2
    assert {message["role"] for message in data["messages"]} == {
        "user",
        "assistant",
    }


def test_user_cannot_access_another_users_conversation(
    client,
    auth_headers,
    monkeypatch,
):
    monkeypatch.setattr(
        conversation_routes,
        "semantic_search",
        lambda **kwargs: [],
    )

    created = client.post(
        "/api/v1/conversations/ask",
        headers=auth_headers,
        json={"question": "Tell me about the policy."},
    )

    conversation_id = created.json()["conversation_id"]

    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Another User",
            "email": "conversation-owner@example.com",
            "password": "AnotherPassword123!",
        },
    )

    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "conversation-owner@example.com",
            "password": "AnotherPassword123!",
        },
    )

    another_headers = {
        "Authorization": f"Bearer {login.json()['access_token']}"
    }

    response = client.get(
        f"/api/v1/conversations/{conversation_id}",
        headers=another_headers,
    )

    assert response.status_code == 404


def test_delete_conversation(client, auth_headers, monkeypatch):
    monkeypatch.setattr(
        conversation_routes,
        "semantic_search",
        lambda **kwargs: [],
    )

    created = client.post(
        "/api/v1/conversations/ask",
        headers=auth_headers,
        json={"question": "Tell me about the policy."},
    )

    conversation_id = created.json()["conversation_id"]

    response = client.delete(
        f"/api/v1/conversations/{conversation_id}",
        headers=auth_headers,
    )

    assert response.status_code == 204

    follow_up = client.get(
        f"/api/v1/conversations/{conversation_id}",
        headers=auth_headers,
    )

    assert follow_up.status_code == 404
