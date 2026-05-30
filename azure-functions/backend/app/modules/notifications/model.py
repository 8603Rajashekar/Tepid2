import sqlalchemy as sa
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Text

from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    user_id    = Column(sa.Uuid(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    message    = Column(Text, nullable=False)
    is_read    = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
