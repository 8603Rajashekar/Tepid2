import sqlalchemy as sa
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TaskLocation(Base):
    __tablename__ = "task_locations"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(),
        primary_key=True,
        default=uuid.uuid4,
    )
    task_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
