from datetime import datetime, UTC
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import check_permission, has_permission
from app.core.security import TokenUser
from app.modules.audit_log.service import AuditLogService
from app.modules.notifications.service import NotificationService
from app.modules.service_calls.model import ServiceCall, ServiceStatus
from app.modules.service_calls.schema import ServiceCallCreate, ServiceCallResolve
from app.modules.service_calls.sla import get_sla, sla_elapsed_minutes, is_breached, should_escalate


async def _fetch(db: AsyncSession, call_id: UUID) -> ServiceCall:
    call = await db.get(ServiceCall, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Service call not found")
    return call


def _enrich(call: ServiceCall) -> ServiceCall:
    """Attach computed SLA fields and auto-escalate if threshold exceeded."""
    call.sla_elapsed_minutes = round(sla_elapsed_minutes(call.created_at), 1)  # type: ignore[attr-defined]
    call.sla_breached = is_breached(call.created_at, call.resolution_sla_minutes)  # type: ignore[attr-defined]

    if (
        call.status not in (ServiceStatus.resolved, ServiceStatus.closed, ServiceStatus.escalated)
        and should_escalate(call.created_at, call.resolution_sla_minutes)
    ):
        call.status = ServiceStatus.escalated

    return call


class ServiceCallService:

    # ------------------------------------------------------------------
    # CREATE  (any authenticated user — status: new)
    # ------------------------------------------------------------------

    @staticmethod
    async def create(
        db: AsyncSession, data: ServiceCallCreate, current_user: TokenUser,
    ) -> ServiceCall:
        check_permission(current_user, "service_calls", "read")

        sla = get_sla(data.priority)
        call = ServiceCall(
            title=data.title,
            description=data.description,
            priority=data.priority,
            created_by=UUID(current_user.id),
            status=ServiceStatus.pending_assignment,
            response_sla_minutes=sla["response"],
            resolution_sla_minutes=sla["resolution"],
        )
        db.add(call)
        await db.commit()
        await db.refresh(call)

        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="service_calls",
            action="call_created", record_id=str(call.id),
            after_data={"title": call.title, "priority": call.priority, "status": call.status},
        )
        await db.commit()
        return _enrich(call)

    # ------------------------------------------------------------------
    # LIST / GET
    # ------------------------------------------------------------------

    @staticmethod
    async def get_all(db: AsyncSession, current_user: TokenUser) -> list[ServiceCall]:
        check_permission(current_user, "service_calls", "read")
        result = await db.execute(select(ServiceCall).order_by(ServiceCall.created_at.desc()))
        calls = list(result.scalars().all())
        return [_enrich(c) for c in calls]

    @staticmethod
    async def get_one(
        db: AsyncSession, call_id: UUID, current_user: TokenUser,
    ) -> ServiceCall:
        check_permission(current_user, "service_calls", "read")
        call = await _fetch(db, call_id)
        return _enrich(call)

    # ------------------------------------------------------------------
    # ASSIGN  (coordinator / admin → assigned_to; pending_assignment → assigned)
    # ------------------------------------------------------------------

    @staticmethod
    async def assign(
        db: AsyncSession, call_id: UUID, data, current_user: TokenUser,
    ) -> ServiceCall:
        check_permission(current_user, "service_calls", "full")
        call = await _fetch(db, call_id)

        if call.status not in (ServiceStatus.pending_assignment, ServiceStatus.new):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot assign a call with status '{call.status}'",
            )

        call.assigned_to = data.assigned_to
        call.status = ServiceStatus.assigned
        call.assigned_at = datetime.now(UTC)

        await db.commit()
        await db.refresh(call)

        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="service_calls",
            action="call_assigned", record_id=str(call.id),
            after_data={"assigned_to": str(data.assigned_to)},
        )
        await db.commit()

        await NotificationService.send_sms(
            phone=str(data.assigned_to),
            message=f"[Field Ops] You have been assigned service call: '{call.title}' (Priority: {call.priority})",
        )
        return _enrich(call)

    # ------------------------------------------------------------------
    # START  (assigned technician → in_progress)
    # ------------------------------------------------------------------

    @staticmethod
    async def start(
        db: AsyncSession, call_id: UUID, current_user: TokenUser,
    ) -> ServiceCall:
        check_permission(current_user, "service_calls", "read")
        call = await _fetch(db, call_id)

        if call.status != ServiceStatus.assigned:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot start a call with status '{call.status}', expected 'assigned'",
            )

        current_user_id = UUID(current_user.id)
        if call.assigned_to != current_user_id and not has_permission(current_user, "service_calls", "full"):
            raise HTTPException(status_code=403, detail="Only the assigned technician can start this call")

        call.status = ServiceStatus.in_progress
        call.started_at = datetime.now(UTC)

        await db.commit()
        await db.refresh(call)

        await AuditLogService.log(
            db, actor_id=current_user_id, module="service_calls",
            action="call_started", record_id=str(call.id),
            after_data={"status": call.status},
        )
        await db.commit()
        return _enrich(call)

    # ------------------------------------------------------------------
    # RESOLVE  (technician submits resolution notes)
    # ------------------------------------------------------------------

    @staticmethod
    async def resolve(
        db: AsyncSession, call_id: UUID, data: ServiceCallResolve, current_user: TokenUser,
    ) -> ServiceCall:
        check_permission(current_user, "service_calls", "read")
        call = await _fetch(db, call_id)

        if call.status not in (ServiceStatus.in_progress, ServiceStatus.escalated):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot resolve a call with status '{call.status}'",
            )

        current_user_id = UUID(current_user.id)
        if call.assigned_to != current_user_id and not has_permission(current_user, "service_calls", "full"):
            raise HTTPException(status_code=403, detail="Only the assigned technician can resolve this call")

        call.status = ServiceStatus.resolved
        call.resolution_notes = data.resolution_notes
        call.resolved_at = datetime.now(UTC)

        await db.commit()
        await db.refresh(call)

        await AuditLogService.log(
            db, actor_id=current_user_id, module="service_calls",
            action="call_resolved", record_id=str(call.id),
            after_data={"notes": data.resolution_notes},
        )
        await db.commit()
        return _enrich(call)

    # ------------------------------------------------------------------
    # CLOSE  (coordinator / admin final closure)
    # ------------------------------------------------------------------

    @staticmethod
    async def close(
        db: AsyncSession, call_id: UUID, current_user: TokenUser,
    ) -> ServiceCall:
        check_permission(current_user, "service_calls", "full")
        call = await _fetch(db, call_id)

        if call.status != ServiceStatus.resolved:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot close a call with status '{call.status}', expected 'resolved'",
            )

        call.status = ServiceStatus.closed
        call.closed_at = datetime.now(UTC)

        await db.commit()
        await db.refresh(call)

        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="service_calls",
            action="call_closed", record_id=str(call.id),
            after_data={"closed_at": str(call.closed_at)},
        )
        await db.commit()
        return _enrich(call)

    # ------------------------------------------------------------------
    # ESCALATE  (manual escalation by coordinator / admin)
    # ------------------------------------------------------------------

    @staticmethod
    async def escalate(
        db: AsyncSession, call_id: UUID, current_user: TokenUser,
    ) -> ServiceCall:
        check_permission(current_user, "service_calls", "full")
        call = await _fetch(db, call_id)

        if call.status in (ServiceStatus.resolved, ServiceStatus.closed):
            raise HTTPException(
                status_code=400,
                detail="Cannot escalate a resolved or closed call",
            )

        call.status = ServiceStatus.escalated

        await db.commit()
        await db.refresh(call)

        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="service_calls",
            action="call_escalated", record_id=str(call.id),
            after_data={"status": call.status},
        )
        await db.commit()
        return _enrich(call)
