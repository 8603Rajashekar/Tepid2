from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.modules.tasks.model import TaskPriority, TaskStatus, TaskType

_TERMINAL = {TaskStatus.approved, TaskStatus.rejected}


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    assigned_to: Optional[UUID] = None          # primary assignee
    assigned_to_ids: list[UUID] = Field(default_factory=list)  # multiple assignees
    priority: TaskPriority = TaskPriority.normal
    task_type: TaskType = TaskType.other
    due_date: Optional[datetime] = None

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: datetime | None) -> datetime | None:
        if v is not None and v <= datetime.utcnow():
            raise ValueError("due_date must be in the future")
        return v

    @model_validator(mode="after")
    def at_least_one_assignee(self) -> "TaskCreate":
        if not self.assigned_to and not self.assigned_to_ids:
            raise ValueError("Provide at least one assignee (assigned_to or assigned_to_ids)")
        if not self.assigned_to and self.assigned_to_ids:
            self.assigned_to = self.assigned_to_ids[0]
        return self


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    assigned_to: Optional[UUID] = None
    priority: Optional[TaskPriority] = None
    task_type: Optional[TaskType] = None
    due_date: Optional[datetime] = None

    @field_validator("due_date")
    @classmethod
    def validate_due_date(cls, v: datetime | None) -> datetime | None:
        if v is not None and v <= datetime.utcnow():
            raise ValueError("due_date must be in the future")
        return v


class TaskSubmit(BaseModel):
    remarks: str = Field(..., min_length=3, max_length=2000,
                         description="Required remarks about the completed work")


class TaskAssign(BaseModel):
    assigned_to: Optional[UUID] = None
    assigned_to_ids: list[UUID] = Field(default_factory=list)

    @model_validator(mode="after")
    def at_least_one_assignee(self) -> "TaskAssign":
        if not self.assigned_to and not self.assigned_to_ids:
            raise ValueError("Provide at least one assignee")
        if not self.assigned_to and self.assigned_to_ids:
            self.assigned_to = self.assigned_to_ids[0]
        return self


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
    task_type: TaskType
    status: TaskStatus
    due_date: Optional[datetime]

    assigned_at: Optional[datetime]
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

    co_assignees: Optional[list] = None
    submission_remarks: Optional[str] = None

    # Enriched display fields — populated by the router/service, not stored in DB
    assigned_to_name: Optional[str] = None
    created_by_name: Optional[str] = None
    assigned_to_role: Optional[str] = None
    created_by_role: Optional[str] = None
    co_assignee_names: Optional[list] = None

    # Computed — not stored in DB
    is_overdue: bool = False

    @model_validator(mode="after")
    def compute_overdue(self) -> "TaskResponse":
        if self.due_date and self.status not in _TERMINAL:
            now = datetime.now(timezone.utc)
            due = self.due_date if self.due_date.tzinfo else self.due_date.replace(tzinfo=timezone.utc)
            self.is_overdue = due < now
        return self

    class Config:
        from_attributes = True
