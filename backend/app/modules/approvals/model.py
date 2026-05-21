import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy import event
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ApprovalModule(str, enum.Enum):
    task         = "task"
    expense      = "expense"
    document     = "document"
    service_call = "service_call"


class ApprovalAction(str, enum.Enum):
    approved  = "approved"
    rejected  = "rejected"
    escalated = "escalated"


class SignatureType(str, enum.Enum):
    drawn = "drawn"
    typed = "typed"
    otp   = "otp"


class ApprovalLog(Base):
    __tablename__ = "approval_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    module:  Mapped[ApprovalModule] = mapped_column(Enum(ApprovalModule), nullable=False)
    ref_id:  Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), nullable=False, index=True)

    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False,
    )

    action:         Mapped[ApprovalAction] = mapped_column(Enum(ApprovalAction), nullable=False)
    signature_type: Mapped[SignatureType]  = mapped_column(Enum(SignatureType), nullable=False)
    signature_data: Mapped[str | None]     = mapped_column(Text, nullable=True)

    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    ip_address: Mapped[str | None] = mapped_column(String(45),  nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    # SHA-256 of (ref_id + actor_id + action + timestamp.isoformat())
    hash: Mapped[str] = mapped_column(String(64), nullable=False)


@event.listens_for(ApprovalLog, "before_update")
def _prevent_approval_log_update(mapper, connection, target) -> None:
    raise ValueError("approval_logs are immutable and cannot be updated")


@event.listens_for(ApprovalLog, "before_delete")
def _prevent_approval_log_delete(mapper, connection, target) -> None:
    raise ValueError("approval_logs are immutable and cannot be deleted")
