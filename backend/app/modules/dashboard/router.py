"""
/dashboard/overview and /dashboard/employee

Returns role-filtered metrics so every user sees data relevant to them:
  - employee        → own tasks + own expenses only
  - service_coordinator → service call stats focus
  - finance_officer → expense pipeline focus
  - supervisor      → team task approvals + calls
  - admin / super_admin → full picture
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.approvals.model import ApprovalLog, ApprovalModule
from app.modules.documents.model import Document, DocumentStatus
from app.modules.expenses.model import Expense, ExpenseStatus
from app.modules.service_calls.model import ServiceCall, ServiceStatus
from app.modules.tasks.model import Task, TaskStatus
from app.modules.work_reports.model import WorkReport

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ── helpers ────────────────────────────────────────────────────────────

async def _count(db: AsyncSession, stmt) -> int:
    return await db.scalar(stmt) or 0


async def _task_counts(db: AsyncSession, user_id: UUID | None = None) -> dict:
    """Return task status counts, optionally scoped to a single user."""
    base = select(func.count()).select_from(Task)
    if user_id:
        base = base.where(Task.assigned_to == user_id)

    return {
        "total_tasks":       await _count(db, base),
        "pending_tasks":     await _count(db, base.where(Task.status == TaskStatus.pending_review)),
        "in_progress_tasks": await _count(db, base.where(Task.status == TaskStatus.in_progress)),
        "completed_tasks":   await _count(db, base.where(Task.status == TaskStatus.approved)),
        "new_tasks":         await _count(db, base.where(Task.status == TaskStatus.new)),
        "rejected_tasks":    await _count(db, base.where(Task.status == TaskStatus.rejected)),
    }


async def _call_counts(db: AsyncSession) -> dict:
    base = select(func.count()).select_from(ServiceCall)
    return {
        "active_calls":    await _count(db, base.where(ServiceCall.status.in_([
                               ServiceStatus.pending_assignment,
                               ServiceStatus.assigned,
                               ServiceStatus.in_progress,
                           ]))),
        "sla_risks":       await _count(db, base.where(ServiceCall.status == ServiceStatus.escalated)),
        "unassigned_calls":await _count(db, base.where(ServiceCall.status == ServiceStatus.pending_assignment)),
        "resolved_calls":  await _count(db, base.where(ServiceCall.status == ServiceStatus.resolved)),
        "total_calls":     await _count(db, base),
    }


async def _expense_counts(
    db: AsyncSession,
    user_id: UUID | None = None,
    pending_statuses: list | None = None,
) -> dict:
    base     = select(func.count()).select_from(Expense)
    amt_base = select(func.sum(Expense.amount)).select_from(Expense)
    if user_id:
        base     = base.where(Expense.submitted_by == user_id)
        amt_base = amt_base.where(Expense.submitted_by == user_id)

    if pending_statuses is None:
        pending_statuses = [
            ExpenseStatus.submitted,
            ExpenseStatus.supervisor_approved,
            ExpenseStatus.finance_approved,
        ]
    return {
        "expenses_pending":  await _count(db, base.where(Expense.status.in_(pending_statuses))),
        "expenses_approved": await _count(db, base.where(Expense.status.in_([
                                 ExpenseStatus.admin_approved, ExpenseStatus.reimbursed,
                             ]))),
        "expenses_total":    await _count(db, base),
        "pending_amount":    float(
            await db.scalar(amt_base.where(Expense.status.in_(pending_statuses))) or 0
        ),
    }


async def _approval_counts(db: AsyncSession, role: str = "") -> dict:
    tasks_pend = await _count(db,
        select(func.count()).select_from(Task).where(Task.status == TaskStatus.pending_review)
    )
    docs_pend = await _count(db,
        select(func.count()).select_from(Document).where(
            Document.status.in_([DocumentStatus.review, DocumentStatus.signing])
        )
    )
    # Expense stage relevant to the caller's role in the approval chain
    if role in ("admin", "super_admin"):
        exp_status = [ExpenseStatus.finance_approved]
    elif role in ("finance", "finance_officer"):
        exp_status = [ExpenseStatus.submitted, ExpenseStatus.supervisor_approved]
    else:  # supervisor — read-only, no expense approvals to action
        exp_status = []
    exp_pend = await _count(db,
        select(func.count()).select_from(Expense).where(Expense.status.in_(exp_status))
    )
    return {
        "pending_approvals": tasks_pend + docs_pend + exp_pend,
        "tasks_pending_review": tasks_pend,
        "docs_pending":      docs_pend,
    }


# ── main endpoint ──────────────────────────────────────────────────────

@router.get("/overview")
async def dashboard_overview(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    role = current_user.role
    uid  = UUID(current_user.id)

    # ── Employee — only see their own data ─────────────────────────────
    if role == "employee":
        tasks    = await _task_counts(db, user_id=uid)
        expenses = await _expense_counts(db, user_id=uid)
        return {
            **tasks,
            **expenses,
            "active_calls":     None,
            "sla_risks":        None,
            "pending_approvals":None,
            "unassigned_calls": None,
            "scope":            "own",
        }

    # ── Service Coordinator — focus on calls ───────────────────────────
    if role == "service_coordinator":
        calls    = await _call_counts(db)
        tasks    = await _task_counts(db)
        return {
            **calls,
            **tasks,
            "pending_approvals": None,
            "expenses_pending":  None,
            "scope":             "service_coordinator",
        }

    # ── Finance Officer — focus on expenses ────────────────────────────
    if role == "finance_officer":
        expenses  = await _expense_counts(db, pending_statuses=[ExpenseStatus.submitted, ExpenseStatus.supervisor_approved])
        approvals = await _approval_counts(db, role)
        tasks     = await _task_counts(db)
        return {
            **expenses,
            **approvals,
            **tasks,
            "active_calls": None,
            "sla_risks":    None,
            "scope":        "finance_officer",
        }

    # ── Supervisor — team approvals + calls ────────────────────────────
    if role == "supervisor":
        tasks     = await _task_counts(db)
        calls     = await _call_counts(db)
        approvals = await _approval_counts(db, role)
        expenses  = await _expense_counts(db)
        return {
            **tasks,
            **calls,
            **approvals,
            **expenses,
            "scope": "supervisor",
        }

    # ── Admin / Super Admin — everything ──────────────────────
    tasks     = await _task_counts(db)
    calls     = await _call_counts(db)
    approvals = await _approval_counts(db, role)
    expenses  = await _expense_counts(db, pending_statuses=[ExpenseStatus.finance_approved])
    return {
        **tasks,
        **calls,
        **approvals,
        **expenses,
        "scope": role,
    }


# ── Employee personal dashboard ────────────────────────────────────────

@router.get("/employee")
async def employee_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    uid = UUID(current_user.id)

    # All my expenses ordered newest first
    exp_result = await db.execute(
        select(Expense)
        .where(Expense.submitted_by == uid)
        .order_by(Expense.created_at.desc())
    )
    expenses = list(exp_result.scalars().all())

    PENDING_ST  = {ExpenseStatus.submitted, ExpenseStatus.supervisor_approved, ExpenseStatus.finance_approved}
    APPROVED_ST = {ExpenseStatus.admin_approved, ExpenseStatus.reimbursed}

    total    = len(expenses)
    pending  = sum(1 for e in expenses if e.status in PENDING_ST)
    approved = sum(1 for e in expenses if e.status in APPROVED_ST)
    rejected = sum(1 for e in expenses if e.status == ExpenseStatus.rejected)

    recent_expenses = [
        {
            "id":         str(e.id),
            "title":      e.title,
            "amount":     float(e.amount),
            "status":     e.status.value,
            "category":   e.category.value,
            "receipt_url": e.receipt_url,
            "created_at": e.created_at.isoformat(),
        }
        for e in expenses[:5]
    ]

    # Monthly approved spend (last 6 months)
    since = datetime.now(timezone.utc) - timedelta(days=180)
    m_rows = await db.execute(
        select(
            extract("year",  Expense.created_at).label("yr"),
            extract("month", Expense.created_at).label("mo"),
            func.sum(Expense.amount).label("total"),
        )
        .where(Expense.submitted_by == uid)
        .where(Expense.created_at >= since)
        .where(Expense.status.in_([ExpenseStatus.admin_approved, ExpenseStatus.reimbursed]))
        .group_by("yr", "mo")
        .order_by("yr", "mo")
    )
    MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly = [
        {"month": MONTHS[int(r.mo)], "total": float(r.total or 0)}
        for r in m_rows
    ]

    # Recent activity — approval logs for my expenses + my work report submissions
    exp_ids = [e.id for e in expenses]
    activity = []

    if exp_ids:
        log_rows = await db.execute(
            select(ApprovalLog)
            .where(ApprovalLog.ref_id.in_(exp_ids))
            .where(ApprovalLog.module == ApprovalModule.expense)
            .order_by(ApprovalLog.timestamp.desc())
            .limit(8)
        )
        exp_map = {e.id: e for e in expenses}
        for log in log_rows.scalars().all():
            exp = exp_map.get(log.ref_id)
            activity.append({
                "type":    "expense",
                "action":  log.action.value,
                "title":   exp.title if exp else "Expense",
                "amount":  float(exp.amount) if exp else 0,
                "ts":      log.timestamp.isoformat(),
            })

    # Recent work reports
    wr_rows = await db.execute(
        select(WorkReport)
        .where(WorkReport.user_id == uid)
        .order_by(WorkReport.created_at.desc())
        .limit(5)
    )
    for wr in wr_rows.scalars().all():
        activity.append({
            "type":   "work_report",
            "action": "submitted",
            "title":  f"Work report — {wr.report_date}",
            "amount": 0,
            "ts":     wr.created_at.isoformat(),
        })

    activity.sort(key=lambda x: x["ts"], reverse=True)
    activity = activity[:10]

    return {
        "total_expenses":    total,
        "pending_expenses":  pending,
        "approved_expenses": approved,
        "rejected_expenses": rejected,
        "recent_expenses":   recent_expenses,
        "monthly_expenses":  monthly,
        "recent_activity":   activity,
    }
