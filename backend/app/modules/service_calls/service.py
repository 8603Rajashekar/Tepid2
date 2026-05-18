from datetime import datetime, UTC
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenUser
from app.modules.audit_log.service import AuditLogService
from app.modules.notifications.service import NotificationService
from app.modules.service_calls.model import ServiceCall, ServiceCallStatus

PRIVILEGED_ROLES = {"admin", "super_admin", "manager"}


def _is_privileged(user: TokenUser) -> bool:
    return bool(set(user.roles) & PRIVILEGED_ROLES)


class ServiceCallService:

    @staticmethod
    async def create(db: AsyncSession, data, current_user: TokenUser) -> ServiceCall:
        call = ServiceCall(**data.dict())
        db.add(call)
        await db.commit()
        await db.refresh(call)

        await AuditLogService.log(
            db,
            actor_id=UUID(current_user.id),
            module="service_calls",
            action="call_created",
            record_id=str(call.id),
            after_data={"customer": call.customer_name, "status": call.status},
        )
        await db.commit()

        return call

    @staticmethod
    async def assign(db: AsyncSession, call_id: UUID, user_id: UUID, current_user: TokenUser) -> ServiceCall:
        if not _is_privileged(current_user):
            raise HTTPException(status_code=403, detail="Only admin or manager can assign service calls")

        call = await db.get(ServiceCall, call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Service call not found")

        call.assigned_to = user_id
        call.status = ServiceCallStatus.assigned
        await db.commit()
        await db.refresh(call)

        await AuditLogService.log(
            db,
            actor_id=UUID(current_user.id),
            module="service_calls",
            action="call_assigned",
            record_id=str(call.id),
            after_data={"assigned_to": str(user_id)},
        )
        await db.commit()

        await NotificationService.send_sms(
            phone=str(user_id),
            message=f"You have been assigned a service call: {call.issue_description}",
        )

        return call

    @staticmethod
    async def update_status(db: AsyncSession, call_id: UUID, status: ServiceCallStatus, current_user: TokenUser) -> ServiceCall:
        call = await db.get(ServiceCall, call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Service call not found")

        is_assignee = call.assigned_to == UUID(current_user.id)
        if not _is_privileged(current_user) and not is_assignee:
            raise HTTPException(status_code=403, detail="You can only update your own assigned service calls")

        prev_status = call.status
        call.status = status

        if status == ServiceCallStatus.in_progress:
            call.started_at = datetime.now(UTC)
        elif status == ServiceCallStatus.resolved:
            call.resolved_at = datetime.now(UTC)

        await db.commit()
        await db.refresh(call)

        await AuditLogService.log(
            db,
            actor_id=UUID(current_user.id),
            module="service_calls",
            action="status_updated",
            record_id=str(call.id),
            before_data={"status": prev_status},
            after_data={"status": status},
        )
        await db.commit()

        return call

    @staticmethod
    async def close(db: AsyncSession, call_id: UUID, notes: str, current_user: TokenUser) -> ServiceCall:
        call = await db.get(ServiceCall, call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Service call not found")

        is_assignee = call.assigned_to == UUID(current_user.id)
        if not _is_privileged(current_user) and not is_assignee:
            raise HTTPException(status_code=403, detail="You can only close your own assigned service calls")

        call.status = ServiceCallStatus.closed
        call.closed_at = datetime.now(UTC)
        call.resolution_notes = notes

        await db.commit()
        await db.refresh(call)

        await AuditLogService.log(
            db,
            actor_id=UUID(current_user.id),
            module="service_calls",
            action="call_closed",
            record_id=str(call.id),
            after_data={"notes": notes},
        )
        await db.commit()

        return call
