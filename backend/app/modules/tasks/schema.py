from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.modules.tasks.model import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    assigned_to: Optional[UUID] = None
    priority: TaskPriority = TaskPriority.normal
    due_date: datetime

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: datetime) -> datetime:
        if v <= datetime.utcnow():
            raise ValueError("due_date must be in the future")
        return v


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    assigned_to: Optional[UUID] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: datetime | None) -> datetime | None:
        if v is not None and v <= datetime.utcnow():
            raise ValueError("due_date must be in the future")
        return v


class TaskAssign(BaseModel):
    assigned_to: UUID


class TaskReject(BaseModel):
    rejection_reason: str = Field(..., min_length=5, max_length=1000)


# Kept for backward-compat with the generic PATCH /status endpoint
class TaskStatusUpdate(BaseModel):
    status: TaskStatus
    note: Optional[str] = None


# Kept for backward-compat — new code uses dedicated endpoints
class TaskApproval(BaseModel):
    action: str

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v not in {"approved", "rejected"}:
            raise ValueError("action must be 'approved' or 'rejected'")
        return v

    rejection_reason: Optional[str] = None

    @field_validator("rejection_reason")
    @classmethod
    def validate_reason(cls, v: Optional[str], info) -> Optional[str]:
        if info.data.get("action") == "rejected" and not v:
            raise ValueError("rejection_reason is required when rejecting")
        return v


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    created_by: UUID
    assigned_to: Optional[UUID]
    priority: TaskPriority
    status: TaskStatus
    due_date: datetime

    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    time_spent_minutes: Optional[int]

    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]

    delay_minutes: Optional[int]
    efficiency_score: Optional[float]

    created_at: datetime
    updated_at: datetime

    # Enriched display fields — populated by the router/service, not stored in DB
    assigned_to_name: Optional[str] = None
    created_by_name: Optional[str] = None

    class Config:
        from_attributes = True
