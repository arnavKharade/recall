
from uuid import UUID

from pydantic import BaseModel, Field


class SemanticSearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=1000)
    limit: int = Field(default=5, ge=1, le=20)


class SearchResult(BaseModel):
    chunk_id: UUID
    document_id: UUID
    document_name: str
    page_number: int
    content: str
    similarity: float


class SemanticSearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    total_results: int
