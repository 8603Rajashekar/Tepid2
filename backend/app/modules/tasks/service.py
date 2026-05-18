from datetime import datetime, UTC
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenUser
from app.modules.tasks.model import Task
from app.modules.tasks.repository import TaskRepository
from app.modules.tasks.schema import CheckInRequest, TaskCreate, TaskUpdate

ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    "pending": ["in_progress"],
    "in_progress": ["completed"],
    "completed": [],
}


class TaskService:

    @staticmethod
    async def create_task(
        db: AsyncSession,
        data: TaskCreate,
        current_user: TokenUser,
    ) -> Task:
        current_user_id = UUID(current_user.id)
        task = Task(
            title=data.title,
            description=data.description,
            assigned_to=data.assigned_to or current_user_id,
            created_by=current_user_id,
        )
        return await TaskRepository.create(db, task)

    @staticmethod
    async def get_tasks(db: AsyncSession) -> list[Task]:
        return await TaskRepository.get_all(db)

    @staticmethod
    async def get_my_tasks(db: AsyncSession, current_user: TokenUser) -> list[Task]:
        return await TaskRepository.get_by_assigned_user(db, UUID(current_user.id))

    @staticmethod
    async def get_task(db: AsyncSession, task_id: UUID) -> Task:
        task = await TaskRepository.get_by_id(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task

    @staticmethod
    async def update_task(
        db: AsyncSession,
        task_id: UUID,
        data: TaskUpdate,
        current_user: TokenUser,
    ) -> Task:
        task = await TaskRepository.get_by_id(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        is_admin = "admin" in current_user.roles or "super_admin" in current_user.roles
        is_assignee = task.assigned_to == UUID(current_user.id)

        if not is_admin and not is_assignee:
            raise HTTPException(status_code=403, detail="Not allowed to update this task")

        if data.status is not None:
            allowed = ALLOWED_TRANSITIONS.get(task.status, [])
            if data.status not in allowed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid transition: {task.status} → {data.status}. Allowed: {allowed or ['none']}",
                )
            if data.status == "in_progress" and not task.started_at:
                task.started_at = datetime.now(UTC)
            if data.status == "completed":
                task.completed_at = datetime.now(UTC)
            task.status = data.status

        for field, value in data.model_dump(exclude_unset=True, exclude={"status"}).items():
            setattr(task, field, value)

        return await TaskRepository.update(db, task)

    @staticmethod
    async def check_in(
        db: AsyncSession,
        task_id: UUID,
        data: CheckInRequest,
        current_user: TokenUser,
    ) -> Task:
        task = await TaskRepository.get_by_id(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if task.assigned_to != UUID(current_user.id):
            raise HTTPException(status_code=403, detail="Only the assigned user can check in")

        if task.status == "completed":
            raise HTTPException(status_code=400, detail="Cannot check in to a completed task")

        task.latitude = data.latitude
        task.longitude = data.longitude
        task.status = "in_progress"
        if not task.started_at:
            task.started_at = datetime.now(UTC)

        return await TaskRepository.update(db, task)
