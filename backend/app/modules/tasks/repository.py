from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tasks.model import Task


class TaskRepository:

    @staticmethod
    async def create(db: AsyncSession, task: Task) -> Task:
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def get_all(db: AsyncSession) -> list[Task]:
        result = await db.execute(select(Task))
        return list(result.scalars().all())

    @staticmethod
    async def get_by_assigned_user(db: AsyncSession, user_id: UUID) -> list[Task]:
        result = await db.execute(
            select(Task).where(Task.assigned_to == user_id)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, task_id: UUID) -> Task | None:
        result = await db.execute(select(Task).where(Task.id == task_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def update(db: AsyncSession, task: Task) -> Task:
        await db.commit()
        await db.refresh(task)
        return task
