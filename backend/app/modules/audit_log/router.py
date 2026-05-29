"""
GET /audit-logs/

Admin-only activity history — returns the latest audit log entries across all
modules with optional filters for module, action, and actor.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

_ADMIN_ROLES = {"admin", "super_admin"}


class AuditLogOut(BaseModel):
    id:          UUID
    actor_id:    Optional[UUID]
    actor_name:  Optional[str] = None
    actor_email: Optional[str] = None
    module:      str
    action:      str
    record_id:   Optional[str]
    before_data: Optional[dict]
    after_data:  Optional[dict]
    ip_address:  Optional[str]
    created_at:  datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[AuditLogOut])
async def list_audit_logs(
    module:   Optional[str] = Query(None, description="Filter by module (tasks, expenses, …)"),
    action:   Optional[str] = Query(None, description="Filter by action keyword"),
    actor_id: Optional[UUID] = Query(None, description="Filter by actor user ID"),
    limit:    int            = Query(50, ge=1, le=200),
    db:       AsyncSession   = Depends(get_db),
    current_user: TokenUser  = Depends(get_current_user),
):
    """Return audit log entries. Admin / super_admin only."""
    if current_user.role not in _ADMIN_ROLES:
        raise HTTPException(403, "Only admins can view the audit log")

    query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if module:
        query = query.where(AuditLog.module == module)
    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))
    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)

    rows = (await db.execute(query)).scalars().all()

    # Enrich with actor name/email in one batch
    actor_ids = {r.actor_id for r in rows if r.actor_id}
    actors: dict[UUID, User] = {}
    if actor_ids:
        user_rows = (await db.execute(select(User).where(User.id.in_(actor_ids)))).scalars().all()
        actors = {u.id: u for u in user_rows}

    results = []
    for r in rows:
        actor = actors.get(r.actor_id) if r.actor_id else None
        results.append(
            AuditLogOut(
                id          = r.id,
                actor_id    = r.actor_id,
                actor_name  = actor.full_name if actor else None,
                actor_email = actor.email     if actor else None,
                module      = r.module,
                action      = r.action,
                record_id   = r.record_id,
                before_data = r.before_data,
                after_data  = r.after_data,
                ip_address  = r.ip_address,
                created_at  = r.created_at,
            )
        )
    return results
