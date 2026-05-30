from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.models.user import User, UserRole
from app.modules.tasks.schema import (
    TaskApproval,
    TaskAssign,
    TaskCreate,
    TaskReject,
    TaskResponse,
    TaskStatusUpdate,
    TaskSubmit,
    TaskUpdate,
)
from app.modules.tasks.service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def _canonical_role(role: UserRole) -> str:
    role_value = role.value
    if role_value == "super_admin":
        return "admin"
    if role_value == "service_coordinator":
        return "coordinator"
    if role_value == "finance":
        return "finance_officer"
    return role_value


async def _enrich(tasks, db: AsyncSession) -> list[TaskResponse]:
    """Attach name/role fields for all assignees and creator."""
    ids = set()
    for t in tasks:
        if t.assigned_to:
            ids.add(t.assigned_to)
        ids.add(t.created_by)
        for uid_str in (t.co_assignees or []):
            try:
                ids.add(UUID(uid_str))
            except Exception:
                pass

    user_map: dict[UUID, tuple[str, str]] = {}
    if ids:
        rows = await db.execute(select(User.id, User.full_name, User.role).where(User.id.in_(ids)))
        user_map = {r.id: (r.full_name, _canonical_role(r.role)) for r in rows}

    results = []
    for t in tasks:
        resp = TaskResponse.model_validate(t)
        assigned_to = user_map.get(t.assigned_to) if t.assigned_to else None
        created_by = user_map.get(t.created_by)
        resp.assigned_to_name = assigned_to[0] if assigned_to else None
        resp.assigned_to_role = assigned_to[1] if assigned_to else None
        resp.created_by_name = created_by[0] if created_by else None
        resp.created_by_role = created_by[1] if created_by else None
        if t.co_assignees:
            resp.co_assignee_names = [
                user_map[UUID(uid_str)][0]
                for uid_str in t.co_assignees
                if uid_str and UUID(uid_str) in user_map
            ]
        results.append(resp)
    return results


# ── CRUD ──────────────────────────────────────────────────────────────

@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    task = await TaskService.create_task(db, data, current_user)
    enriched = await _enrich([task], db)
    return enriched[0]


@router.get("/my", response_model=list[TaskResponse])
async def get_my_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    tasks = await TaskService.get_my_tasks(db, current_user)
    return await _enrich(tasks, db)


@router.get("/assignees", response_model=list[dict])
async def get_assignees(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Return all users who can be assigned tasks, filtered by caller's role."""
    role = current_user.role
    if role in ("admin", "super_admin"):
        allowed = [
            UserRole.admin,
            UserRole.super_admin,
            UserRole.supervisor,
            UserRole.coordinator,
            UserRole.service_coordinator,
            UserRole.employee,
            UserRole.crm,
            UserRole.finance_officer,
            UserRole.finance,
        ]
    elif role == "supervisor":
        allowed = [UserRole.coordinator, UserRole.employee,
                   UserRole.service_coordinator, UserRole.crm]
    elif role in ("coordinator", "service_coordinator"):
        allowed = [UserRole.employee]
    else:
        return []

    rows = await db.execute(
        select(User.id, User.full_name, User.role, User.email)
        .where(User.role.in_(allowed))
        .where(User.is_active == True)
        .order_by(User.full_name)
    )
    return [
        {
            "id": str(r.id),
            "full_name": r.full_name,
            "role": _canonical_role(r.role),
            "email": r.email,
        }
        for r in rows
    ]


@router.get("/", response_model=list[TaskResponse])
async def get_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    tasks = await TaskService.get_tasks(db, current_user)
    return await _enrich(tasks, db)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    task = await TaskService.get_task(db, task_id, current_user)
    enriched = await _enrich([task], db)
    return enriched[0]


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await TaskService.update_task(db, task_id, data, current_user)


# ── WORKFLOW ENDPOINTS ────────────────────────────────────────────────

@router.post("/{task_id}/assign", response_model=TaskResponse)
async def assign_task(
    task_id: UUID,
    data: TaskAssign,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Admin / supervisor / coordinator assigns a task to someone. (new → assigned)"""
    task = await TaskService.assign_task(db, task_id, data, current_user)
    enriched = await _enrich([task], db)
    return enriched[0]


@router.post("/{task_id}/start", response_model=TaskResponse)
async def start_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Assigned employee starts work. (assigned → in_progress)"""
    task = await TaskService.start_task(db, task_id, current_user)
    enriched = await _enrich([task], db)
    return enriched[0]


@router.post("/{task_id}/submit", response_model=TaskResponse)
async def submit_task(
    task_id: UUID,
    data: TaskSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Employee submits completed work with remarks. (in_progress → pending_review)"""
    task = await TaskService.submit_task(db, task_id, current_user, data)
    enriched = await _enrich([task], db)
    return enriched[0]


@router.post("/{task_id}/approve", response_model=TaskResponse)
async def approve_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Task creator / admin approves the submitted work. (pending_review → approved)"""
    task = await TaskService.approve_task_action(db, task_id, current_user)
    enriched = await _enrich([task], db)
    return enriched[0]


@router.post("/{task_id}/reject", response_model=TaskResponse)
async def reject_task(
    task_id: UUID,
    data: TaskReject,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Task creator / admin rejects work with a reason. Task auto-returns to assigned."""
    task = await TaskService.reject_task_action(db, task_id, data, current_user)
    enriched = await _enrich([task], db)
    return enriched[0]


# ── LEGACY (kept for frontend backward-compat) ────────────────────────

@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_status(
    task_id: UUID,
    data: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await TaskService.update_status(db, task_id, data, current_user)


@router.post("/{task_id}/approve-legacy", response_model=TaskResponse)
async def approve_task_legacy(
    task_id: UUID,
    data: TaskApproval,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Legacy combined approve+reject endpoint. Use /approve and /reject instead."""
    return await TaskService.approve_task(db, task_id, data, current_user)
