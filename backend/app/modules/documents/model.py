import sqlalchemy as sa
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DocumentStatus(str, enum.Enum):
    uploaded = "uploaded"
    review   = "review"
    signing  = "signing"
    approved = "approved"
    rejected = "rejected"
    archived = "archived"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)

    name:     Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[str] = mapped_column(String(2000), nullable=False)
    version:  Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    folder_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid(), nullable=True)

    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(), ForeignKey("users.id"), nullable=False,
    )

    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.uploaded, nullable=False,
    )

    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(), ForeignKey("users.id"), nullable=True,
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
