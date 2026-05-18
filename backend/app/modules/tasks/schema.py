from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from typing import Optional

from app.modules.tasks.model import TaskPriority, TaskStatus


# 🔹 CREATE
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    assigned_to: Optional[UUID] = None
    priority: TaskPriority = TaskPriority.normal
    due_date: datetime

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: datetime):
        if v <= datetime.utcnow():
            raise ValueError("due_date must be in the future")
        return v


# 🔹 UPDATE
class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    assigned_to: Optional[UUID] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: datetime | None):
        if v is not None and v <= datetime.utcnow():
            raise ValueError("due_date must be in the future")
        return v


# 🔹 STATUS UPDATE
class TaskStatusUpdate(BaseModel):
    status: TaskStatus
    note: Optional[str] = None


# 🔹 APPROVAL
class TaskApproval(BaseModel):
    action: str  # "approved" or "rejected"
    rejection_reason: Optional[str] = None

    @field_validator("action")
    @classmethod
    def validate_action(cls, v):
        if v not in ["approved", "rejected"]:
            raise ValueError("action must be 'approved' or 'rejected'")
        return v

    @field_validator("rejection_reason")
    @classmethod
    def validate_reason(cls, v, info):
        if info.data.get("action") == "rejected" and not v:
            raise ValueError("rejection_reason is required when rejecting")
        return v


# 🔹 RESPONSE
class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    created_by: UUID
    assigned_to: Optional[UUID]
    priority: TaskPriority
    status: TaskStatus
    due_date: datetime

    completed_at: Optional[datetime]
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
