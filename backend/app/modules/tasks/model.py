import uuid
from datetime import datetime

from sqlalchemy import Float, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

import enum


# ✅ ENUMS (Company standard)
class TaskPriority(str, enum.Enum):
    critical = "critical"
    high = "high"
    normal = "normal"
    low = "low"


class TaskStatus(str, enum.Enum):
    new = "new"
    assigned = "assigned"
    in_progress = "in_progress"
    pending_review = "pending_review"
    approved = "approved"
    rejected = "rejected"


class Task(Base):
    __tablename__ = "tasks"

    # 🔑 Primary Key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # 📌 Basic Info
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 👤 Ownership
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )

    # ⚙️ Business Fields
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority),
        nullable=False,
        default=TaskPriority.normal,
    )

    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus),
        nullable=False,
        default=TaskStatus.new,
    )

    due_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # ⏱️ Workflow Tracking
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )

    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 📊 Efficiency Scoring
    delay_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    efficiency_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # 📊 Audit Fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
