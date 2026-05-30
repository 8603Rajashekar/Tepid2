from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.models.user import User
from app.modules.expenses.model import Expense
from app.modules.tasks.model import Task
from app.modules.crm.model import CRMCall

router = APIRouter(prefix="/search", tags=["Search"])

# Roles that can search across users
ADMIN_ROLES = {"admin", "super_admin", "supervisor"}
# Roles that can search CRM
CRM_SEARCH_ROLES = {"admin", "super_admin", "crm"}


@router.get("/")
async def global_search(
    q: str = Query(..., min_length=1, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """
    Role-aware global search across tasks, expenses, users, and CRM.
    Returns up to 5 results per category.
    """
    term = f"%{q.strip().lower()}%"
    results = {}

    # ── Tasks ────────────────────────────────────────────────────────────
    task_query = select(Task).where(
        Task.deleted_at.is_(None),
        or_(
            Task.title.ilike(term),
            Task.description.ilike(term),
        )
    ).limit(5)

    # Non-admin: only tasks assigned to or created by the user
    from uuid import UUID
    uid = UUID(current_user.id)
    if current_user.role not in ADMIN_ROLES:
        task_query = task_query.where(
            or_(Task.assigned_to == uid, Task.created_by == uid)
        )

    task_res = await db.execute(task_query)
    tasks = task_res.scalars().all()
    results["tasks"] = [
        {
            "id": str(t.id),
            "title": t.title,
            "status": t.status.value if hasattr(t.status, "value") else t.status,
            "priority": t.priority.value if hasattr(t.priority, "value") else t.priority,
            "url": "/tasks",
        }
        for t in tasks
    ]

    # ── Expenses ─────────────────────────────────────────────────────────
    exp_query = select(Expense).where(
        or_(
            Expense.title.ilike(term),
            Expense.description.ilike(term),
        )
    ).limit(5)

    if current_user.role not in {*ADMIN_ROLES, "finance", "finance_officer"}:
        exp_query = exp_query.where(Expense.submitted_by == uid)

    exp_res = await db.execute(exp_query)
    expenses = exp_res.scalars().all()
    results["expenses"] = [
        {
            "id": str(e.id),
            "title": e.title,
            "amount": float(e.amount),
            "status": e.status.value if hasattr(e.status, "value") else e.status,
            "url": "/expenses",
        }
        for e in expenses
    ]

    # ── Users (admin / supervisor only) ──────────────────────────────────
    if current_user.role in ADMIN_ROLES:
        user_res = await db.execute(
            select(User).where(
                User.deleted_at.is_(None),
                or_(
                    User.full_name.ilike(term),
                    User.email.ilike(term),
                    User.department.ilike(term),
                    User.designation.ilike(term),
                )
            ).limit(5)
        )
        users = user_res.scalars().all()
        results["users"] = [
            {
                "id": str(u.id),
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role.value if hasattr(u.role, "value") else u.role,
                "department": u.department,
                "url": "/users",
            }
            for u in users
        ]

    # ── CRM (admin / super_admin / crm only) ─────────────────────────────
    if current_user.role in CRM_SEARCH_ROLES:
        crm_res = await db.execute(
            select(CRMCall).where(
                or_(
                    CRMCall.customer_name.ilike(term),
                    CRMCall.company_name.ilike(term),
                    CRMCall.phone.ilike(term),
                    CRMCall.description.ilike(term),
                )
            ).limit(5)
        )
        crm_calls = crm_res.scalars().all()
        results["crm"] = [
            {
                "id": str(c.id),
                "customer_name": c.customer_name,
                "company_name": c.company_name,
                "phone": c.phone,
                "status": c.status,
                "url": "/crm",
            }
            for c in crm_calls
        ]

    # ── Summary ──────────────────────────────────────────────────────────
    total = sum(len(v) for v in results.values())
    return {"query": q, "total": total, "results": results}
