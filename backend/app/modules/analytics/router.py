from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.service_calls.model import ServiceCall, ServiceCallStatus
from app.modules.tasks.model import Task, TaskStatus
from app.modules.tracking.model import TaskLocation

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_overview(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    total       = await db.scalar(select(func.count()).select_from(Task))
    new_        = await db.scalar(select(func.count()).select_from(Task).where(Task.status == TaskStatus.new))
    assigned    = await db.scalar(select(func.count()).select_from(Task).where(Task.status == TaskStatus.assigned))
    in_progress = await db.scalar(select(func.count()).select_from(Task).where(Task.status == TaskStatus.in_progress))
    pending_rev = await db.scalar(select(func.count()).select_from(Task).where(Task.status == TaskStatus.pending_review))
    approved    = await db.scalar(select(func.count()).select_from(Task).where(Task.status == TaskStatus.approved))
    rejected    = await db.scalar(select(func.count()).select_from(Task).where(Task.status == TaskStatus.rejected))
    locations   = await db.scalar(select(func.count()).select_from(TaskLocation))

    return {
        "tasks": {
            "total": total,
            "new": new_,
            "assigned": assigned,
            "in_progress": in_progress,
            "pending_review": pending_rev,
            "approved": approved,
            "rejected": rejected,
        },
        "location_pings": locations,
    }


@router.get("/agent-performance")
async def get_agent_performance(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    rows = await db.execute(
        select(Task.assigned_to, func.count().label("total_tasks"))
        .where(Task.assigned_to.isnot(None))
        .group_by(Task.assigned_to)
        .order_by(func.count().desc())
    )
    tasks_per_agent = [{"agent_id": str(r.assigned_to), "total_tasks": r.total_tasks} for r in rows]

    approved_rows = await db.execute(
        select(Task.assigned_to, func.count().label("approved"))
        .where(Task.status == TaskStatus.approved)
        .where(Task.assigned_to.isnot(None))
        .group_by(Task.assigned_to)
    )
    approved_map = {str(r.assigned_to): r.approved for r in approved_rows}

    avg_completion_rows = await db.execute(
        select(
            Task.assigned_to,
            func.avg(
                func.extract("epoch", Task.completed_at) - func.extract("epoch", Task.created_at)
            ).label("avg_seconds"),
        )
        .where(Task.completed_at.isnot(None))
        .where(Task.assigned_to.isnot(None))
        .group_by(Task.assigned_to)
    )
    avg_map = {str(r.assigned_to): round(r.avg_seconds or 0, 0) for r in avg_completion_rows}

    for row in tasks_per_agent:
        agent_id = row["agent_id"]
        row["approved"] = approved_map.get(agent_id, 0)
        row["avg_completion_seconds"] = avg_map.get(agent_id, None)

    return {"agent_performance": tasks_per_agent}


@router.get("/service-calls")
async def get_service_call_metrics(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    total    = await db.scalar(select(func.count()).select_from(ServiceCall))
    open_    = await db.scalar(select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceCallStatus.open))
    assigned = await db.scalar(select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceCallStatus.assigned))
    in_prog  = await db.scalar(select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceCallStatus.in_progress))
    resolved = await db.scalar(select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceCallStatus.resolved))
    closed   = await db.scalar(select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceCallStatus.closed))

    avg_resolution = await db.scalar(
        select(
            func.avg(
                func.extract("epoch", ServiceCall.resolved_at) - func.extract("epoch", ServiceCall.created_at)
            )
        ).where(ServiceCall.resolved_at.isnot(None))
    )

    return {
        "service_calls": {
            "total": total,
            "open": open_,
            "assigned": assigned,
            "in_progress": in_prog,
            "resolved": resolved,
            "closed": closed,
        },
        "avg_resolution_seconds": round(avg_resolution or 0, 0),
    }
