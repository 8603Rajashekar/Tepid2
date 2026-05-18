from datetime import datetime, UTC
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenUser
from app.modules.audit_log.service import AuditLogService
from app.modules.notifications.service import NotificationService
from app.modules.tasks.model import Task, TaskStatus
from app.modules.tasks.repository import TaskRepository
from app.modules.tasks.schema import TaskApproval, TaskCreate, TaskStatusUpdate, TaskUpdate

ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    TaskStatus.new:            [TaskStatus.assigned],
    TaskStatus.assigned:       [TaskStatus.in_progress],
    TaskStatus.in_progress:    [TaskStatus.pending_review],
    TaskStatus.pending_review: [],   # handled exclusively by approve_task
    TaskStatus.approved:       [],
    TaskStatus.rejected:       [],
}

PRIVILEGED_ROLES = {"admin", "super_admin", "manager"}


def _is_privileged(user: TokenUser) -> bool:
    return bool(set(user.roles) & PRIVILEGED_ROLES)


class TaskService:

    @staticmethod
    async def create_task(
        db: AsyncSession,
        data: TaskCreate,
        current_user: TokenUser,
    ) -> Task:
        current_user_id = UUID(current_user.id)

        # Agents can only create tasks for themselves
        if not _is_privileged(current_user) and data.assigned_to and data.assigned_to != current_user_id:
            raise HTTPException(status_code=403, detail="Agents can only assign tasks to themselves")

        task = Task(
            title=data.title,
            description=data.description,
            assigned_to=data.assigned_to,
            created_by=current_user_id,
            priority=data.priority,
            due_date=data.due_date,
        )
        task = await TaskRepository.create(db, task)

        await AuditLogService.log(
            db,
            actor_id=current_user_id,
            module="tasks",
            action="task_created",
            record_id=str(task.id),
            after_data={"title": task.title, "status": task.status},
        )

        if task.assigned_to:
            await NotificationService.send_email(
                to=str(task.assigned_to),
                subject="New Task Assigned",
                body=f"You have been assigned task: {task.title}",
            )

        return task

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

        is_creator = task.created_by == UUID(current_user.id)
        if not _is_privileged(current_user) and not is_creator:
            raise HTTPException(status_code=403, detail="Not allowed to update this task")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(task, field, value)

        return await TaskRepository.update(db, task)

    @staticmethod
    async def update_status(
        db: AsyncSession,
        task_id: UUID,
        data: TaskStatusUpdate,
        current_user: TokenUser,
    ) -> Task:
        task = await TaskRepository.get_by_id(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Agents can only update their own assigned tasks
        is_assignee = task.assigned_to == UUID(current_user.id)
        if not _is_privileged(current_user) and not is_assignee:
            raise HTTPException(status_code=403, detail="You can only update status of your own tasks")

        allowed = ALLOWED_TRANSITIONS.get(task.status, [])
        if data.status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transition: {task.status} → {data.status}. Allowed: {allowed or ['none']}",
            )

        prev_status = task.status
        task.status = data.status

        if data.status == TaskStatus.pending_review:
            task.completed_at = datetime.now(UTC)

        await AuditLogService.log(
            db,
            actor_id=UUID(current_user.id),
            module="tasks",
            action="status_updated",
            record_id=str(task.id),
            before_data={"status": prev_status},
            after_data={"status": data.status},
        )

        return await TaskRepository.update(db, task)

    @staticmethod
    async def approve_task(
        db: AsyncSession,
        task_id: UUID,
        data: TaskApproval,
        current_user: TokenUser,
    ) -> Task:
        task = await TaskRepository.get_by_id(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if task.status != TaskStatus.pending_review:
            raise HTTPException(
                status_code=400,
                detail="Only tasks in pending_review can be approved or rejected",
            )

        if not _is_privileged(current_user):
            raise HTTPException(status_code=403, detail="Only admin or manager can approve or reject tasks")

        approver_id = UUID(current_user.id)

        if data.action == "approved":
            task.status = TaskStatus.approved
            task.approved_by = approver_id
            task.approved_at = datetime.now(UTC)

            await NotificationService.send_email(
                to=str(task.assigned_to),
                subject="Task Approved",
                body=f"Your task '{task.title}' has been approved.",
            )

        else:  # rejected
            task.status = TaskStatus.rejected
            task.rejection_reason = data.rejection_reason

            await NotificationService.send_email(
                to=str(task.assigned_to),
                subject="Task Rejected",
                body=f"Your task '{task.title}' was rejected. Reason: {task.rejection_reason}",
            )

        await AuditLogService.log(
            db,
            actor_id=approver_id,
            module="tasks",
            action=f"task_{data.action}",
            record_id=str(task.id),
            after_data={"status": task.status, "reason": data.rejection_reason},
        )

        return await TaskRepository.update(db, task)
