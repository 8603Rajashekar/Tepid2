from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.modules.crm.model import CallPriority, CallStatus, CallType

_CLOSED_STATUSES = {CallStatus.resolved, CallStatus.closed}


class CRMCallCreate(BaseModel):
    call_type:     CallType
    customer_name: str            = Field(..., min_length=2, max_length=200)
    phone:         str            = Field(..., min_length=7, max_length=20)
    company_name:  Optional[str]  = Field(None, max_length=300)
    location:      Optional[str]  = Field(None, max_length=300)
    description:   Optional[str]  = Field(None, max_length=3000)
    priority:      CallPriority   = CallPriority.medium

    # Service / Order
    equipment_name: Optional[str] = Field(None, max_length=200)
    urgency:        Optional[str] = Field(None, max_length=100)

    # Order
    quantity:             Optional[int]     = None
    amount:               Optional[Decimal] = Field(None, ge=0)
    special_requirements: Optional[str]     = Field(None, max_length=2000)

    # Enquiry
    question:       Optional[str] = Field(None, max_length=3000)
    response_given: Optional[str] = Field(None, max_length=3000)

    follow_up_date: Optional[datetime] = None
    assigned_to:    Optional[UUID]     = None
    direction:      Optional[str]      = "outbound"   # "inbound" | "outbound"

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) < 7:
            raise ValueError("Phone number must contain at least 7 digits")
        return v


class CRMCallUpdate(BaseModel):
    status:               Optional[CallStatus]   = None
    priority:             Optional[CallPriority] = None
    description:          Optional[str]          = Field(None, max_length=3000)
    company_name:         Optional[str]          = Field(None, max_length=300)
    location:             Optional[str]          = Field(None, max_length=300)
    assigned_to:          Optional[UUID]         = None
    follow_up_date:       Optional[datetime]     = None
    resolution_notes:     Optional[str]          = Field(None, max_length=3000)
    response_given:       Optional[str]          = Field(None, max_length=3000)
    equipment_name:       Optional[str]          = Field(None, max_length=200)
    quantity:             Optional[int]          = None
    amount:               Optional[Decimal]      = Field(None, ge=0)
    special_requirements: Optional[str]          = Field(None, max_length=2000)
    # Call log fields
    direction:             Optional[str]         = None
    call_duration_seconds: Optional[int]         = None
    call_outcome:          Optional[str]         = None
    call_notes:            Optional[str]         = Field(None, max_length=3000)


class CRMCallResponse(BaseModel):
    id:            UUID
    call_type:     CallType
    status:        CallStatus
    priority:      CallPriority
    customer_name: str
    phone:         str
    company_name:  Optional[str]
    location:      Optional[str]
    description:   Optional[str]

    equipment_name:       Optional[str]
    urgency:              Optional[str]
    quantity:             Optional[int]
    amount:               Optional[Decimal]
    special_requirements: Optional[str]
    question:             Optional[str]
    response_given:       Optional[str]
    resolution_notes:     Optional[str]

    follow_up_date: Optional[datetime]
    resolved_at:    Optional[datetime]
    closed_at:      Optional[datetime]

    direction:             Optional[str]
    call_duration_seconds: Optional[int]
    call_outcome:          Optional[str]
    call_notes:            Optional[str]

    created_by:  UUID
    assigned_to: Optional[UUID]
    created_at:  datetime
    updated_at:  datetime

    # Computed — not stored in DB
    follow_up_overdue: bool = False

    @model_validator(mode="after")
    def compute_follow_up_overdue(self) -> "CRMCallResponse":
        if self.follow_up_date and self.status not in _CLOSED_STATUSES:
            now = datetime.now(timezone.utc)
            fud = self.follow_up_date if self.follow_up_date.tzinfo else self.follow_up_date.replace(tzinfo=timezone.utc)
            self.follow_up_overdue = fud < now
        return self

    class Config:
        from_attributes = True
