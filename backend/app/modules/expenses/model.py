import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

FINANCE_APPROVAL_THRESHOLD = 10_000


class ExpenseCategory(str, enum.Enum):
    travel        = "travel"
    meals         = "meals"
    equipment     = "equipment"
    software      = "software"
    accommodation = "accommodation"
    fuel          = "fuel"
    other         = "other"


class ExpenseStatus(str, enum.Enum):
    draft               = "draft"
    submitted           = "submitted"
    supervisor_approved = "supervisor_approved"
    finance_approved    = "finance_approved"
    admin_approved      = "admin_approved"
    rejected            = "rejected"
    reimbursed          = "reimbursed"


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )

    title: Mapped[str]      = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    category: Mapped[ExpenseCategory] = mapped_column(Enum(ExpenseCategory), nullable=False)
    receipt_url: Mapped[str | None]   = mapped_column(String(500), nullable=True)

    status: Mapped[ExpenseStatus] = mapped_column(
        Enum(ExpenseStatus), default=ExpenseStatus.draft, nullable=False,
    )

    # Who submitted
    submitted_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Supervisor level
    supervisor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True,
    )
    supervisor_approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Finance level (required when amount > FINANCE_APPROVAL_THRESHOLD)
    finance_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True,
    )
    finance_approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Rejection
    rejected_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Reimbursement
    reimbursed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
