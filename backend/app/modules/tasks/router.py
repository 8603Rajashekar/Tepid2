from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.tasks.schema import (
    TaskApproval,
    TaskAssign,
    TaskCreate,
    TaskReject,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.modules.tasks.service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# ── CRUD ──────────────────────────────────────────────────────────────

@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await TaskService.create_task(db, data, current_user)


@router.get("/my", response_model=list[TaskResponse])
async def get_my_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await TaskService.get_my_tasks(db, current_user)


@router.get("/", response_model=list[TaskResponse])
async def get_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await TaskService.get_tasks(db, current_user)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await TaskService.get_task(db, task_id, current_user)


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
    """Admin / supervisor assigns a new task to an employee. (new → assigned)"""
    return await TaskService.assign_task(db, task_id, data, current_user)


@router.post("/{task_id}/start", response_model=TaskResponse)
async def start_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Assigned employee starts work. (assigned → in_progress)"""
    return await TaskService.start_task(db, task_id, current_user)


@router.post("/{task_id}/submit", response_model=TaskResponse)
async def submit_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Employee submits completed work for review. Calculates efficiency score. (in_progress → pending_review)"""
    return await TaskService.submit_task(db, task_id, current_user)


@router.post("/{task_id}/approve", response_model=TaskResponse)
async def approve_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Supervisor / admin approves the submitted work. (pending_review → approved)"""
    return await TaskService.approve_task_action(db, task_id, current_user)


@router.post("/{task_id}/reject", response_model=TaskResponse)
async def reject_task(
    task_id: UUID,
    data: TaskReject,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Supervisor / admin rejects work with a reason. Task auto-returns to assigned. (pending_review → rejected → assigned)"""
    return await TaskService.reject_task_action(db, task_id, data, current_user)


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
