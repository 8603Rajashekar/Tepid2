import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CallType(str, enum.Enum):
    service  = "service"
    issue    = "issue"
    enquiry  = "enquiry"
    order    = "order"


class CallStatus(str, enum.Enum):
    open        = "open"
    in_progress = "in_progress"
    resolved    = "resolved"
    closed      = "closed"


class CallPriority(str, enum.Enum):
    low    = "low"
    medium = "medium"
    high   = "high"
    urgent = "urgent"


class CRMCall(Base):
    __tablename__ = "crm_calls"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    call_type:     Mapped[CallType]     = mapped_column(Enum(CallType),     nullable=False)
    status:        Mapped[CallStatus]   = mapped_column(Enum(CallStatus),   default=CallStatus.open,   nullable=False)
    priority:      Mapped[CallPriority] = mapped_column(Enum(CallPriority), default=CallPriority.medium, nullable=False)

    # Contact (mandatory)
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone:         Mapped[str] = mapped_column(String(20),  nullable=False)
    location:      Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Core fields (all types)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Service / Order
    equipment_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    urgency:        Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Order only
    quantity:             Mapped[int | None]   = mapped_column(Integer, nullable=True)
    amount:               Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    special_requirements: Mapped[str | None]   = mapped_column(Text, nullable=True)

    # Enquiry only
    question:       Mapped[str | None] = mapped_column(Text, nullable=True)
    response_given: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Resolution
    resolution_notes: Mapped[str | None]        = mapped_column(Text, nullable=True)
    resolved_at:      Mapped[datetime | None]   = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at:        Mapped[datetime | None]   = mapped_column(DateTime(timezone=True), nullable=True)

    # Follow-up
    follow_up_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relations
    created_by:  Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
