from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional

from app.modules.service_calls.model import ServiceCallStatus


class ServiceCallCreate(BaseModel):
    customer_name: str
    customer_phone: str
    issue_description: str


class ServiceCallAssign(BaseModel):
    assigned_to: UUID


class ServiceCallUpdateStatus(BaseModel):
    status: ServiceCallStatus


class ServiceCallClose(BaseModel):
    resolution_notes: str


class ServiceCallResponse(BaseModel):
    id: UUID
    customer_name: str
    customer_phone: str
    issue_description: str
    assigned_to: Optional[UUID]
    status: ServiceCallStatus

    created_at: datetime
    started_at: Optional[datetime]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]

    resolution_notes: Optional[str]

    class Config:
        from_attributes = True
