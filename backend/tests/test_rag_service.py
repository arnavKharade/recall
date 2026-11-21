
import httpx
import pytest

from app.services import rag_service


@pytest.fixture
def sources():
    return [
        {
            "chunk_id": "chunk-1",
            "document_id": "doc-1",
            "document_name": "Operations Handbook.pdf",
            "page_number": 3,
            "content": "The meal allowance is ₹350 for shifts exceeding 9 hours.",
            "similarity": 0.85,
        },
        {
            "chunk_id": "chunk-2",
            "document_id": "doc-1",
            "document_name": "Operations Handbook.pdf",
            "page_number": 5,
            "content": "The Dispatch Lead is responsible for coordinating deliveries.",
            "similarity": 0.78,
        },
        {
            "chunk_id": "chunk-3",
            "document_id": "doc-2",
            "document_name": "Safety Policy.pdf",
            "page_number": 2,
            "content": "Employees must wear appropriate safety equipment.",
            "similarity": 0.72,
        },
    ]


class FakeOllamaResponse:
    def __init__(self, content):
        self.content = content

    def raise_for_status(self):
        pass

    def json(self):
        return {
            "message": {
                "content": self.content,
            }
        }


def mock_ollama(monkeypatch, content):
    def fake_post(*args, **kwargs):
        return FakeOllamaResponse(content)

    monkeypatch.setattr(rag_service.httpx, "post", fake_post)


def test_no_sources_returns_insufficient_evidence(monkeypatch):
    def unexpected_request(*args, **kwargs):
        pytest.fail("Ollama should not be called when there are no sources.")

    monkeypatch.setattr(rag_service.httpx, "post", unexpected_request)

    answer, cited_sources = rag_service.generate_rag_answer(
        question="What is the annual revenue?",
        sources=[],
    )

    assert answer == rag_service.INSUFFICIENT_EVIDENCE
    assert cited_sources == []


def test_valid_citation_returns_correct_source(monkeypatch, sources):
    mock_ollama(
        monkeypatch,
        "The meal allowance is ₹350 for shifts exceeding 9 hours [1].",
    )

    answer, cited_sources = rag_service.generate_rag_answer(
        question="What is the meal allowance?",
        sources=sources,
    )

    assert answer == (
        "The meal allowance is ₹350 for shifts exceeding 9 hours [1]."
    )
    assert len(cited_sources) == 1
    assert cited_sources[0]["chunk_id"] == "chunk-1"


def test_citations_are_renumbered_in_order_of_appearance(
    monkeypatch,
    sources,
):
    mock_ollama(
        monkeypatch,
        "Employees must wear safety equipment [3]. "
        "The meal allowance is ₹350 [1].",
    )

    answer, cited_sources = rag_service.generate_rag_answer(
        question="Summarize the policies.",
        sources=sources,
    )

    assert answer == (
        "Employees must wear safety equipment [1]. "
        "The meal allowance is ₹350 [2]."
    )

    assert [source["chunk_id"] for source in cited_sources] == [
        "chunk-3",
        "chunk-1",
    ]


def test_duplicate_citations_only_return_one_source(
    monkeypatch,
    sources,
):
    mock_ollama(
        monkeypatch,
        "The meal allowance is ₹350 [1]. "
        "It applies to shifts exceeding 9 hours [1].",
    )

    answer, cited_sources = rag_service.generate_rag_answer(
        question="Explain the meal allowance.",
        sources=sources,
    )

    assert answer.count("[1]") == 2
    assert len(cited_sources) == 1
    assert cited_sources[0]["chunk_id"] == "chunk-1"


def test_invalid_citation_is_removed(monkeypatch, sources):
    mock_ollama(
        monkeypatch,
        "The meal allowance is ₹350 [1]. "
        "The annual revenue is ₹50 crore [99].",
    )

    answer, cited_sources = rag_service.generate_rag_answer(
        question="What are the company finances?",
        sources=sources,
    )

    assert "[99]" not in answer
    assert "[1]" in answer
    assert len(cited_sources) == 1
    assert cited_sources[0]["chunk_id"] == "chunk-1"


def test_no_valid_citations_returns_insufficient_evidence(
    monkeypatch,
    sources,
):
    mock_ollama(
        monkeypatch,
        "The company earns ₹50 crore annually [99].",
    )

    answer, cited_sources = rag_service.generate_rag_answer(
        question="What is the annual revenue?",
        sources=sources,
    )

    assert answer == rag_service.INSUFFICIENT_EVIDENCE
    assert cited_sources == []


def test_missing_citation_keeps_answer_and_attaches_top_source(
    monkeypatch,
    sources,
):
    mock_ollama(
        monkeypatch,
        "The meal allowance is ₹350 for shifts exceeding 9 hours.",
    )

    answer, cited_sources = rag_service.generate_rag_answer(
        question="What is the meal allowance?",
        sources=sources,
    )

    assert answer == (
        "The meal allowance is ₹350 for shifts exceeding 9 hours. [1]"
    )
    assert cited_sources == [sources[0]]


def test_empty_ollama_response_raises_error(monkeypatch, sources):
    mock_ollama(monkeypatch, "")

    with pytest.raises(
        RuntimeError,
        match="Ollama returned an empty response",
    ):
        rag_service.generate_rag_answer(
            question="What is the meal allowance?",
            sources=sources,
        )


def test_ollama_timeout_raises_readable_error(monkeypatch, sources):
    def fake_post(*args, **kwargs):
        raise httpx.TimeoutException("Request timed out")

    monkeypatch.setattr(rag_service.httpx, "post", fake_post)

    with pytest.raises(
        RuntimeError,
        match="local AI model took too long",
    ):
        rag_service.generate_rag_answer(
            question="What is the meal allowance?",
            sources=sources,
        )


def test_ollama_connection_error_raises_readable_error(
    monkeypatch,
    sources,
):
    def fake_post(*args, **kwargs):
        raise httpx.ConnectError("Connection refused")

    monkeypatch.setattr(rag_service.httpx, "post", fake_post)

    with pytest.raises(
        RuntimeError,
        match="Could not communicate with Ollama",
    ):
        rag_service.generate_rag_answer(
            question="What is the meal allowance?",
            sources=sources,
        )
