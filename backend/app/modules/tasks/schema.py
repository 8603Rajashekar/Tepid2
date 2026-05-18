from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    assigned_to: UUID | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class CheckInRequest(BaseModel):
    latitude: float
    longitude: float


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    assigned_to: UUID
    created_by: UUID
    status: str
    latitude: float | None
    longitude: float | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True
