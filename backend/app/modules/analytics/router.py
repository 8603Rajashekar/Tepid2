from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, extract

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.models.user import User
from app.modules.approvals.model import ApprovalLog, ApprovalAction
from app.modules.expenses.model import Expense, ExpenseStatus
from app.modules.service_calls.model import ServiceCall, ServiceStatus
from app.modules.tasks.model import Task, TaskStatus
from app.modules.tracking.model import TaskLocation

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard-overview")
async def dashboard_overview(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    """Single endpoint for the main dashboard widget row."""
    pending_tasks = await db.scalar(
        select(func.count()).select_from(Task).where(Task.status == TaskStatus.pending_review)
    )
    active_calls = await db.scalar(
        select(func.count()).select_from(ServiceCall).where(
            ServiceCall.status.in_([ServiceStatus.pending_assignment, ServiceStatus.assigned, ServiceStatus.in_progress])
        )
    )
    sla_risks = await db.scalar(
        select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceStatus.escalated)
    )
    expenses_pending = await db.scalar(
        select(func.count()).select_from(Expense).where(
            Expense.status.in_([ExpenseStatus.submitted, ExpenseStatus.supervisor_approved])
        )
    )
    total_tasks = await db.scalar(select(func.count()).select_from(Task))
    docs_pending = await db.scalar(
        select(func.count()).select_from(Task)  # placeholder — documents review count
    )

    from app.modules.documents.model import Document, DocumentStatus as DocStatus
    docs_review = await db.scalar(
        select(func.count()).select_from(Document).where(
            Document.status.in_([DocStatus.review, DocStatus.signing])
        )
    )

    return {
        "pending_tasks":       pending_tasks,
        "pending_approvals":   pending_tasks + docs_review,
        "active_service_calls": active_calls,
        "sla_risks":           sla_risks,
        "expenses_pending":    expenses_pending,
        "docs_pending":        docs_review,
        "total_tasks":         total_tasks,
    }


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

    # Expense totals
    exp_pending  = await db.scalar(select(func.count()).select_from(Expense).where(Expense.status == ExpenseStatus.submitted))
    exp_approved = await db.scalar(select(func.count()).select_from(Expense).where(Expense.status == ExpenseStatus.finance_approved))
    exp_total_amount = await db.scalar(
        select(func.sum(Expense.amount)).where(Expense.status.in_([
            ExpenseStatus.finance_approved, ExpenseStatus.reimbursed,
        ]))
    )

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
        "expenses": {
            "pending": exp_pending,
            "approved": exp_approved,
            "total_approved_amount": float(exp_total_amount or 0),
        },
        "location_pings": locations,
    }


@router.get("/pending-approvals")
async def get_pending_approvals(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    """Returns counts of items waiting for action."""
    tasks_pending = await db.scalar(
        select(func.count()).select_from(Task).where(Task.status == TaskStatus.pending_review)
    )
    expenses_pending = await db.scalar(
        select(func.count()).select_from(Expense).where(
            Expense.status.in_([ExpenseStatus.submitted, ExpenseStatus.supervisor_approved])
        )
    )
    calls_escalated = await db.scalar(
        select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceStatus.escalated)
    )
    calls_unassigned = await db.scalar(
        select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceStatus.pending_assignment)
    )

    return {
        "tasks_pending_review": tasks_pending,
        "expenses_pending": expenses_pending,
        "calls_escalated": calls_escalated,
        "calls_unassigned": calls_unassigned,
    }


@router.get("/monthly-expense")
async def monthly_expense(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    """Last 6 months of approved expense totals grouped by month."""
    since = datetime.now(timezone.utc) - timedelta(days=180)
    rows = await db.execute(
        select(
            extract("year",  Expense.created_at).label("year"),
            extract("month", Expense.created_at).label("month"),
            func.sum(Expense.amount).label("total"),
        )
        .where(Expense.created_at >= since)
        .where(Expense.status.in_([ExpenseStatus.finance_approved, ExpenseStatus.reimbursed]))
        .group_by("year", "month")
        .order_by("year", "month")
    )
    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return [
        {"month": f"{month_names[int(r.month)]} {int(r.year)}", "total": float(r.total or 0)}
        for r in rows
    ]


@router.get("/approval-stats")
async def approval_stats(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    """Real approval counts from the audit log, grouped by action."""
    rows = await db.execute(
        select(ApprovalLog.action, func.count().label("count")).group_by(ApprovalLog.action)
    )
    action_map = {r.action: r.count for r in rows}

    return [
        {"name": "Approved",  "value": action_map.get(ApprovalAction.approved,  0)},
        {"name": "Rejected",  "value": action_map.get(ApprovalAction.rejected,  0)},
        {"name": "Escalated", "value": action_map.get(ApprovalAction.escalated, 0)},
    ]


@router.get("/department-spending")
async def department_spending(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    """Total approved spend per department."""
    rows = await db.execute(
        select(User.department, func.sum(Expense.amount).label("total"))
        .join(User, Expense.submitted_by == User.id)
        .where(Expense.status.in_([ExpenseStatus.finance_approved, ExpenseStatus.reimbursed]))
        .group_by(User.department)
        .order_by(func.sum(Expense.amount).desc())
    )
    return [{"department": r.department, "value": float(r.total or 0)} for r in rows]


@router.get("/task-stats")
async def task_stats(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    """Task counts grouped by status — for bar/pie charts."""
    rows = await db.execute(
        select(Task.status, func.count().label("count")).group_by(Task.status)
    )
    return [{"name": r.status, "value": r.count} for r in rows]


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
    total     = await db.scalar(select(func.count()).select_from(ServiceCall))
    pending   = await db.scalar(select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceStatus.pending_assignment))
    assigned  = await db.scalar(select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceStatus.assigned))
    in_prog   = await db.scalar(select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceStatus.in_progress))
    escalated = await db.scalar(select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceStatus.escalated))
    resolved  = await db.scalar(select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceStatus.resolved))
    closed    = await db.scalar(select(func.count()).select_from(ServiceCall).where(ServiceCall.status == ServiceStatus.closed))

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
            "pending_assignment": pending,
            "assigned": assigned,
            "in_progress": in_prog,
            "escalated": escalated,
            "resolved": resolved,
            "closed": closed,
        },
        "avg_resolution_seconds": round(avg_resolution or 0, 0),
    }
