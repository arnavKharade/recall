
from uuid import uuid4

from app.api.routes import documents as document_routes


def test_semantic_search_returns_results(
    client,
    auth_headers,
    monkeypatch,
):
    document_id = uuid4()
    chunk_id = uuid4()

    expected_results = [
        {
            "chunk_id": chunk_id,
            "document_id": document_id,
            "document_name": "operations.pdf",
            "page_number": 3,
            "content": "The meal allowance is ₹350 for shifts exceeding 9 hours.",
            "similarity": 0.85,
        }
    ]

    monkeypatch.setattr(
        document_routes,
        "semantic_search",
        lambda **kwargs: expected_results,
    )

    response = client.post(
        "/api/v1/documents/search/semantic",
        headers=auth_headers,
        json={
            "query": "What is the meal allowance?",
            "limit": 5,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["query"] == "What is the meal allowance?"
    assert data["total_results"] == 1
    assert len(data["results"]) == 1
    assert data["results"][0]["document_name"] == "operations.pdf"
    assert data["results"][0]["page_number"] == 3
    assert data["results"][0]["similarity"] == 0.85


def test_semantic_search_requires_authentication(client):
    response = client.post(
        "/api/v1/documents/search/semantic",
        json={"query": "Find the meal allowance."},
    )

    assert response.status_code == 401


def test_semantic_search_rejects_invalid_query(
    client,
    auth_headers,
):
    response = client.post(
        "/api/v1/documents/search/semantic",
        headers=auth_headers,
        json={"query": "x"},
    )

    assert response.status_code == 422


def test_semantic_search_rejects_invalid_limit(
    client,
    auth_headers,
):
    response = client.post(
        "/api/v1/documents/search/semantic",
        headers=auth_headers,
        json={
            "query": "Find the meal allowance.",
            "limit": 50,
        },
    )

    assert response.status_code == 422
