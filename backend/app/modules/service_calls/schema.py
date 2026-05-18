from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.service_calls.model import ServicePriority, ServiceStatus


class ServiceCallCreate(BaseModel):
    title: str               = Field(..., min_length=5, max_length=200)
    description: str         = Field(..., min_length=10, max_length=5000)
    priority: ServicePriority


class ServiceCallAssign(BaseModel):
    assigned_to: UUID


class ServiceCallResolve(BaseModel):
    resolution_notes: str = Field(..., min_length=10, max_length=5000)


class ServiceCallResponse(BaseModel):
    id: UUID
    title: str
    description: str
    status: ServiceStatus
    priority: ServicePriority

    created_by: UUID
    assigned_to: Optional[UUID]

    created_at: datetime
    assigned_at: Optional[datetime]
    started_at: Optional[datetime]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]

    resolution_notes: Optional[str]

    response_sla_minutes: Optional[int]
    resolution_sla_minutes: Optional[int]

    # Computed SLA fields (populated by service layer, not stored)
    sla_elapsed_minutes: Optional[float] = None
    sla_breached: Optional[bool] = None

    class Config:
        from_attributes = True
