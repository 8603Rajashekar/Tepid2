from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenUser
from app.modules.crm.model import CRMCall, CallStatus
from app.modules.crm.schema import CRMCallCreate, CRMCallUpdate


class CRMService:

    @staticmethod
    async def create(db: AsyncSession, data: CRMCallCreate, user: TokenUser) -> CRMCall:
        call = CRMCall(
            **data.model_dump(),
            created_by=UUID(user.id),
            updated_at=datetime.now(UTC),
        )
        db.add(call)
        await db.commit()
        await db.refresh(call)
        return call

    @staticmethod
    async def get_all(db: AsyncSession, call_type=None) -> list[CRMCall]:
        stmt = select(CRMCall).order_by(CRMCall.created_at.desc())
        if call_type:
            stmt = stmt.where(CRMCall.call_type == call_type)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_one(db: AsyncSession, call_id: UUID) -> CRMCall:
        call = await db.get(CRMCall, call_id)
        if not call:
            raise HTTPException(status_code=404, detail="CRM call not found")
        return call

    @staticmethod
    async def update(db: AsyncSession, call_id: UUID, data: CRMCallUpdate, user: TokenUser) -> CRMCall:
        call = await CRMService.get_one(db, call_id)
        now = datetime.now(UTC)

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(call, field, value)

        # Auto-set timestamps on status transitions
        if data.status == CallStatus.resolved and not call.resolved_at:
            call.resolved_at = now
        if data.status == CallStatus.closed and not call.closed_at:
            call.closed_at = now

        call.updated_at = now
        await db.commit()
        await db.refresh(call)
        return call

    @staticmethod
    async def get_followups(db: AsyncSession) -> list[CRMCall]:
        """Return calls with due follow-up dates that are not closed."""
        now = datetime.now(UTC)
        result = await db.execute(
            select(CRMCall)
            .where(CRMCall.follow_up_date <= now)
            .where(CRMCall.status.notin_([CallStatus.closed, CallStatus.resolved]))
            .order_by(CRMCall.follow_up_date.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def delete(db: AsyncSession, call_id: UUID) -> None:
        call = await CRMService.get_one(db, call_id)
        await db.delete(call)
        await db.commit()
