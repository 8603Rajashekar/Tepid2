import sqlalchemy as sa
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ServiceStatus(str, enum.Enum):
    new                = "new"
    pending_assignment = "pending_assignment"
    assigned           = "assigned"
    in_progress        = "in_progress"
    resolved           = "resolved"
    closed             = "closed"
    escalated          = "escalated"


class ServicePriority(str, enum.Enum):
    critical = "critical"
    high     = "high"
    medium   = "medium"
    low      = "low"


class ServiceCall(Base):
    __tablename__ = "service_calls"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)

    title: Mapped[str]       = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[ServiceStatus] = mapped_column(
        Enum(ServiceStatus), default=ServiceStatus.new, nullable=False,
    )
    priority: Mapped[ServicePriority] = mapped_column(Enum(ServicePriority), nullable=False)

    created_by: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(), ForeignKey("users.id"), nullable=False,
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(), ForeignKey("users.id"), nullable=True,
    )

    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now())
    assigned_at: Mapped[datetime | None]  = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None]   = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None]  = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None]    = mapped_column(DateTime(timezone=True), nullable=True)

    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # SLA thresholds in minutes (set at creation based on priority)
    response_sla_minutes: Mapped[int | None]    = mapped_column(Integer, nullable=True)
    resolution_sla_minutes: Mapped[int | None]  = mapped_column(Integer, nullable=True)
