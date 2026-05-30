from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditLogService:

    @staticmethod
    async def log(
        db: AsyncSession,
        *,
        actor_id: UUID | None,
        module: str,
        action: str,
        record_id: str | None = None,
        before_data: dict | None = None,
        after_data: dict | None = None,
    ) -> None:
        entry = AuditLog(
            actor_id=actor_id,
            module=module,
            action=action,
            record_id=record_id,
            before_data=before_data,
            after_data=after_data,
        )
        db.add(entry)
        await db.flush()
