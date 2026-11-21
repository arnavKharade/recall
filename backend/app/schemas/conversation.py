
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AskQuestionRequest(BaseModel):
    question: str = Field(min_length=2, max_length=4000)
    conversation_id: UUID | None = None
    collection_id: UUID | None = None


class CitationResponse(BaseModel):
    chunk_id: UUID
    document_id: UUID
    document_name: str
    page_number: int
    quoted_text: str
    relevance_score: float
    citation_order: int


class MessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    model_name: str | None
    created_at: datetime
    citations: list[CitationResponse] = Field(default_factory=list)


class ConversationResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationDetailResponse(ConversationResponse):
    messages: list[MessageResponse]


class AskQuestionResponse(BaseModel):
    conversation_id: UUID
    user_message: MessageResponse
    assistant_message: MessageResponse
