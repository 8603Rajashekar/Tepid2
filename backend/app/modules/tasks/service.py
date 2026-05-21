from datetime import datetime, UTC
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import check_permission, has_permission, require_role
from app.core.security import TokenUser
from app.modules.audit_log.service import AuditLogService
from app.modules.analytics.ws import manager as ws_manager
from app.modules.notifications.service import NotificationService
from app.modules.tasks.model import Task, TaskPriority, TaskStatus
from app.modules.tasks.repository import TaskRepository
from app.modules.tasks.schema import (
    TaskApproval,
    TaskAssign,
    TaskCreate,
    TaskReject,
    TaskStatusUpdate,
    TaskUpdate,
)

# Strict workflow transitions
ALLOWED_TRANSITIONS: dict[TaskStatus, list[TaskStatus]] = {
    TaskStatus.new:            [TaskStatus.assigned],
    TaskStatus.assigned:       [TaskStatus.in_progress],
    TaskStatus.in_progress:    [TaskStatus.pending_review],
    TaskStatus.pending_review: [TaskStatus.approved, TaskStatus.rejected],
    TaskStatus.approved:       [],
    TaskStatus.rejected:       [TaskStatus.assigned],  # re-assignable after rejection
}

# Priority multiplier for efficiency scoring
_PRIORITY_WEIGHT: dict[str, int] = {
    TaskPriority.critical: 3,
    TaskPriority.high:     2,
    TaskPriority.normal:   1,
    TaskPriority.low:      1,
}


def _validate_transition(current: TaskStatus, new: TaskStatus) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current, [])
    if new not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {current} → {new}. Allowed: {[s.value for s in allowed] or ['none']}",
        )


def _compute_efficiency(task: Task, completed_at: datetime) -> tuple[int, float]:
    """Return (delay_minutes, efficiency_score)."""
    due = task.due_date
    # Make both timezone-aware for comparison
    if due.tzinfo is None:
        due = due.replace(tzinfo=UTC)

    delay_seconds = (completed_at - due).total_seconds()
    delay_minutes = int(delay_seconds / 60)

    weight = _PRIORITY_WEIGHT.get(task.priority, 1)
    # On-time or early → full score; late → 0
    score = float(100 * weight if delay_minutes <= 0 else 0)

    return delay_minutes, score


async def _fetch(db: AsyncSession, task_id: UUID) -> Task:
    task = await TaskRepository.get_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


class TaskService:

    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------

    @staticmethod
    async def create_task(db: AsyncSession, data: TaskCreate, current_user: TokenUser) -> Task:
        check_permission(current_user, "tasks", "own")

        current_user_id = UUID(current_user.id)

        # Non-team roles can only create tasks for themselves
        if not has_permission(current_user, "tasks", "team"):
            if data.assigned_to and data.assigned_to != current_user_id:
                raise HTTPException(status_code=403, detail="You can only assign tasks to yourself")

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
            db, actor_id=current_user_id, module="tasks",
            action="task_created", record_id=str(task.id),
            after_data={"title": task.title, "status": task.status},
        )

        if task.assigned_to:
            await NotificationService.send_email(
                to=str(task.assigned_to),
                subject="New Task Assigned",
                body=f"You have been assigned task: {task.title}",
            )

        return task

    # ------------------------------------------------------------------
    # ASSIGN  (new → assigned)
    # ------------------------------------------------------------------

    @staticmethod
    async def assign_task(
        db: AsyncSession, task_id: UUID, data: TaskAssign, current_user: TokenUser,
    ) -> Task:
        require_role(current_user, "coordinator", "service_coordinator")
        task = await _fetch(db, task_id)
        _validate_transition(task.status, TaskStatus.assigned)

        prev_assignee = task.assigned_to
        task.assigned_to = data.assigned_to
        task.status = TaskStatus.assigned
        task.updated_at = datetime.now(UTC)

        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="tasks",
            action="task_assigned", record_id=str(task.id),
            before_data={"assigned_to": str(prev_assignee)},
            after_data={"assigned_to": str(data.assigned_to), "status": TaskStatus.assigned},
        )

        await NotificationService.send_email(
            to=str(data.assigned_to),
            subject="Task Assigned to You",
            body=f"Task '{task.title}' has been assigned to you. Due: {task.due_date.date()}",
        )

        return await TaskRepository.update(db, task)

    # ------------------------------------------------------------------
    # START  (assigned → in_progress)
    # ------------------------------------------------------------------

    @staticmethod
    async def start_task(db: AsyncSession, task_id: UUID, current_user: TokenUser) -> Task:
        check_permission(current_user, "tasks", "own")
        task = await _fetch(db, task_id)
        _validate_transition(task.status, TaskStatus.in_progress)

        current_user_id = UUID(current_user.id)
        if task.assigned_to != current_user_id and not has_permission(current_user, "tasks", "team"):
            raise HTTPException(status_code=403, detail="Only the assigned employee can start this task")

        task.status = TaskStatus.in_progress
        task.updated_at = datetime.now(UTC)

        await AuditLogService.log(
            db, actor_id=current_user_id, module="tasks",
            action="task_started", record_id=str(task.id),
            after_data={"status": TaskStatus.in_progress},
        )
        return await TaskRepository.update(db, task)

    # ------------------------------------------------------------------
    # SUBMIT FOR REVIEW  (in_progress → pending_review)
    # Calculates efficiency score at the moment of submission
    # ------------------------------------------------------------------

    @staticmethod
    async def submit_task(db: AsyncSession, task_id: UUID, current_user: TokenUser) -> Task:
        check_permission(current_user, "tasks", "own")
        task = await _fetch(db, task_id)
        _validate_transition(task.status, TaskStatus.pending_review)

        current_user_id = UUID(current_user.id)
        if task.assigned_to != current_user_id and not has_permission(current_user, "tasks", "team"):
            raise HTTPException(status_code=403, detail="Only the assigned employee can submit this task")

        completed_at = datetime.now(UTC)
        delay_minutes, efficiency_score = _compute_efficiency(task, completed_at)

        task.status = TaskStatus.pending_review
        task.completed_at = completed_at
        task.delay_minutes = delay_minutes
        task.efficiency_score = efficiency_score
        task.updated_at = completed_at

        await AuditLogService.log(
            db, actor_id=current_user_id, module="tasks",
            action="task_submitted", record_id=str(task.id),
            after_data={
                "status": TaskStatus.pending_review,
                "delay_minutes": delay_minutes,
                "efficiency_score": efficiency_score,
            },
        )
        return await TaskRepository.update(db, task)

    # ------------------------------------------------------------------
    # APPROVE  (pending_review → approved)
    # ------------------------------------------------------------------

    @staticmethod
    async def approve_task_action(
        db: AsyncSession, task_id: UUID, current_user: TokenUser,
    ) -> Task:
        require_role(current_user, "supervisor")
        check_permission(current_user, "tasks", "team")
        task = await _fetch(db, task_id)
        _validate_transition(task.status, TaskStatus.approved)

        approver_id = UUID(current_user.id)
        task.status = TaskStatus.approved
        task.approved_by = approver_id
        task.approved_at = datetime.now(UTC)
        task.updated_at = datetime.now(UTC)

        await NotificationService.send_email(
            to=str(task.assigned_to),
            subject="Task Approved",
            body=f"Your task '{task.title}' has been approved.",
        )

        await AuditLogService.log(
            db, actor_id=approver_id, module="tasks",
            action="task_approved", record_id=str(task.id),
            after_data={"status": TaskStatus.approved},
        )
        await ws_manager.broadcast({"type": "task_update", "action": "approved"})
        return await TaskRepository.update(db, task)

    # ------------------------------------------------------------------
    # REJECT  (pending_review → rejected → automatically back to assigned)
    # ------------------------------------------------------------------

    @staticmethod
    async def reject_task_action(
        db: AsyncSession, task_id: UUID, data: TaskReject, current_user: TokenUser,
    ) -> Task:
        require_role(current_user, "supervisor")
        check_permission(current_user, "tasks", "team")
        task = await _fetch(db, task_id)
        _validate_transition(task.status, TaskStatus.rejected)

        rejector_id = UUID(current_user.id)
        task.status = TaskStatus.rejected
        task.rejection_reason = data.rejection_reason
        task.updated_at = datetime.now(UTC)

        await AuditLogService.log(
            db, actor_id=rejector_id, module="tasks",
            action="task_rejected", record_id=str(task.id),
            after_data={"reason": data.rejection_reason},
        )

        # Auto-reassign back to the same employee so they can rework it
        _validate_transition(TaskStatus.rejected, TaskStatus.assigned)
        task.status = TaskStatus.assigned
        task.completed_at = None
        task.updated_at = datetime.now(UTC)

        await NotificationService.send_email(
            to=str(task.assigned_to),
            subject="Task Rejected — Please Rework",
            body=f"Your task '{task.title}' was rejected. Reason: {data.rejection_reason}\n\nPlease rework and resubmit.",
        )

        await AuditLogService.log(
            db, actor_id=rejector_id, module="tasks",
            action="task_reassigned_after_reject", record_id=str(task.id),
            after_data={"status": TaskStatus.assigned, "assigned_to": str(task.assigned_to)},
        )
        return await TaskRepository.update(db, task)

    # ------------------------------------------------------------------
    # Legacy helpers (kept for backward-compat with PATCH /status)
    # ------------------------------------------------------------------

    @staticmethod
    async def update_status(
        db: AsyncSession, task_id: UUID, data: TaskStatusUpdate, current_user: TokenUser,
    ) -> Task:
        check_permission(current_user, "tasks", "own")
        task = await _fetch(db, task_id)

        is_assignee = task.assigned_to == UUID(current_user.id)
        if not has_permission(current_user, "tasks", "team") and not is_assignee:
            raise HTTPException(status_code=403, detail="You can only update status of your own tasks")

        _validate_transition(task.status, data.status)

        prev_status = task.status
        task.status = data.status
        task.updated_at = datetime.now(UTC)

        if data.status == TaskStatus.pending_review:
            completed_at = datetime.now(UTC)
            task.completed_at = completed_at
            task.delay_minutes, task.efficiency_score = _compute_efficiency(task, completed_at)

        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="tasks",
            action="status_updated", record_id=str(task.id),
            before_data={"status": prev_status},
            after_data={"status": data.status},
        )
        return await TaskRepository.update(db, task)

    @staticmethod
    async def approve_task(
        db: AsyncSession, task_id: UUID, data: TaskApproval, current_user: TokenUser,
    ) -> Task:
        """Legacy combined approve/reject — kept for backward-compat."""
        if data.action == "approved":
            return await TaskService.approve_task_action(db, task_id, current_user)

        reject_data = TaskReject(rejection_reason=data.rejection_reason or "Rejected")
        return await TaskService.reject_task_action(db, task_id, reject_data, current_user)

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    @staticmethod
    async def get_tasks(db: AsyncSession, current_user: TokenUser) -> list[Task]:
        check_permission(current_user, "tasks", "read")
        if has_permission(current_user, "tasks", "own") and not has_permission(current_user, "tasks", "team"):
            return await TaskRepository.get_by_assigned_user(db, UUID(current_user.id))
        return await TaskRepository.get_all(db)

    @staticmethod
    async def get_my_tasks(db: AsyncSession, current_user: TokenUser) -> list[Task]:
        check_permission(current_user, "tasks", "own")
        return await TaskRepository.get_by_assigned_user(db, UUID(current_user.id))

    @staticmethod
    async def get_task(db: AsyncSession, task_id: UUID, current_user: TokenUser) -> Task:
        check_permission(current_user, "tasks", "read")
        task = await _fetch(db, task_id)
        if has_permission(current_user, "tasks", "own") and not has_permission(current_user, "tasks", "team"):
            if task.assigned_to != UUID(current_user.id) and task.created_by != UUID(current_user.id):
                raise HTTPException(status_code=403, detail="You can only view your own tasks")
        return task

    @staticmethod
    async def update_task(
        db: AsyncSession, task_id: UUID, data: TaskUpdate, current_user: TokenUser,
    ) -> Task:
        check_permission(current_user, "tasks", "own")
        task = await _fetch(db, task_id)

        if not has_permission(current_user, "tasks", "team") and task.created_by != UUID(current_user.id):
            raise HTTPException(status_code=403, detail="You can only update tasks you created")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(task, field, value)
        task.updated_at = datetime.now(UTC)

        return await TaskRepository.update(db, task)
