import sqlalchemy as sa
import enum
import uuid
from datetime import datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MoodLevel(str, enum.Enum):
    # Emotional state (original values)
    great      = "great"
    good       = "good"
    neutral    = "neutral"
    struggling = "struggling"
    # Workload intensity (spec values)
    light      = "light"
    normal     = "normal"
    heavy      = "heavy"
    overloaded = "overloaded"


class WorkReport(Base):
    __tablename__ = "work_reports"
    __table_args__ = (
        UniqueConstraint("user_id", "report_date", name="uq_work_report_user_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(), ForeignKey("users.id"), nullable=False,
    )

    report_date:  Mapped[datetime] = mapped_column(Date, nullable=False)
    hours_logged: Mapped[float]    = mapped_column(Float, nullable=False)

    summary:       Mapped[str]        = mapped_column(Text, nullable=False)
    blockers:      Mapped[str | None] = mapped_column(Text, nullable=True)
    tomorrow_plan: Mapped[str | None] = mapped_column(Text, nullable=True)

    mood: Mapped[MoodLevel | None] = mapped_column(Enum(MoodLevel), nullable=True)

    tasks:       Mapped[list | None] = mapped_column(sa.JSON, nullable=True)
    attachments: Mapped[list | None] = mapped_column(sa.JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
