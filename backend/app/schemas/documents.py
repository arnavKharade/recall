from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.models import DocumentStatus


class DocumentResponse(BaseModel):
    id: UUID
    collection_id: UUID | None
    original_filename: str
    mime_type: str
    size_bytes: int
    page_count: int | None
    status: DocumentStatus
    uploaded_at: datetime
    processed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
