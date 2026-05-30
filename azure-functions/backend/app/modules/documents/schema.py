from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.documents.model import DocumentStatus


class DocumentCreate(BaseModel):
    name:      str          = Field(..., min_length=1, max_length=500)
    file_url:  str          = Field(..., min_length=5, max_length=2000)
    folder_id: Optional[UUID] = None


class DocumentReject(BaseModel):
    rejection_reason: str = Field(..., min_length=5, max_length=1000)


class DocumentAction(BaseModel):
    action: str                  # review / esign / signing / approve / reject / archive
    reason: Optional[str] = None


class DocumentResponse(BaseModel):
    id:          UUID
    name:        str
    file_url:    str
    version:     int
    folder_id:   Optional[UUID]
    uploaded_by: UUID
    status:      DocumentStatus

    approved_by: Optional[UUID]
    approved_at: Optional[datetime]

    rejection_reason: Optional[str]

    created_at: datetime

    class Config:
        from_attributes = True
