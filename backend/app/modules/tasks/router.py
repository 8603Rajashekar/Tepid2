from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.tasks.schema import CheckInRequest, TaskCreate, TaskResponse, TaskUpdate
from app.modules.tasks.service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("/", response_model=TaskResponse)
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
    _: TokenUser = Depends(get_current_user),
):
    return await TaskService.get_tasks(db)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    return await TaskService.get_task(db, task_id)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await TaskService.update_task(db, task_id, data, current_user)


@router.post("/{task_id}/check-in", response_model=TaskResponse)
async def check_in(
    task_id: UUID,
    data: CheckInRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await TaskService.check_in(db, task_id, data, current_user)
