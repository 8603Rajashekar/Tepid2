import uuid
from datetime import datetime
import enum

from sqlalchemy import String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


# 🔹 STATUS FLOW
class ServiceCallStatus(str, enum.Enum):
    open = "open"
    assigned = "assigned"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class ServiceCall(Base):
    __tablename__ = "service_calls"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # 📌 Client Info
    customer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False)

    # 🛠 Issue
    issue_description: Mapped[str] = mapped_column(Text, nullable=False)

    # 👤 Assignment
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )

    # 📊 Status
    status: Mapped[ServiceCallStatus] = mapped_column(
        Enum(ServiceCallStatus),
        default=ServiceCallStatus.open,
        nullable=False,
    )

    # ⏱ SLA Tracking
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # 📝 Closure
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
