from datetime import datetime, UTC
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenUser
from app.models.user import User
from app.modules.approvals.model import ApprovalAction, ApprovalLog, ApprovalModule
from app.modules.approvals.schema import ApprovalCreate, ApprovalResponse
from app.modules.approvals.utils import generate_hash

# Roles that are allowed to perform approval actions
_APPROVER_ROLES = {"super_admin", "admin", "supervisor", "finance_officer", "finance", "service_coordinator", "coordinator"}
_ADMIN_ROLES = {"super_admin", "admin"}


async def _apply_to_module(
    db: AsyncSession,
    module: ApprovalModule,
    ref_id: UUID,
    action: ApprovalAction,
    rejection_reason: str | None,
    actor_id: UUID,
    role: str,
    now: datetime,
) -> None:
    """Update the referenced record's status inside the owning module."""
    if role == "employee":
        raise HTTPException(403, f"Role '{role}' is not permitted to approve, reject, or escalate")

    if action == ApprovalAction.escalated and module != ApprovalModule.service_call:
        raise HTTPException(400, "Escalation is only supported for service calls")

    if module == ApprovalModule.task:
        from app.modules.tasks.model import Task, TaskStatus

        task = await db.get(Task, ref_id)
        if not task:
            raise HTTPException(404, "Task not found")
        # Supervisors can approve/reject any pending task (not just ones they created).
        if role not in (*_ADMIN_ROLES, "supervisor", "coordinator", "service_coordinator"):
            raise HTTPException(403, "Only a supervisor, coordinator, or admin can approve/reject tasks")
        if task.status != TaskStatus.pending_review:
            raise HTTPException(400, f"Task is not pending review (status: {task.status})")

        if action == ApprovalAction.approved:
            task.status      = TaskStatus.approved
            task.approved_by = actor_id
            task.approved_at = now
        elif action == ApprovalAction.rejected:
            task.status           = TaskStatus.rejected
            task.rejection_reason = rejection_reason

    elif module == ApprovalModule.expense:
        from app.modules.expenses.model import Expense, ExpenseStatus, FINANCE_APPROVAL_THRESHOLD

        expense = await db.get(Expense, ref_id)
        if not expense:
            raise HTTPException(404, "Expense not found")

        # ── Expense approval flow: Employee → Finance → Admin ──────────────
        # Supervisors are NOT in the expense approval chain.
        # Legacy supervisor_approved records can still be processed by finance.
        if action == ApprovalAction.approved:
            if expense.status == ExpenseStatus.submitted:
                # Only Finance or Admin can approve a freshly submitted expense
                if role in ("finance_officer", "finance", "admin", "super_admin"):
                    expense.status = ExpenseStatus.finance_approved
                    expense.finance_id = actor_id
                    expense.finance_approved_at = now
                else:
                    raise HTTPException(
                        403,
                        f"Role '{role}' cannot approve expenses. "
                        "Expenses must be validated by Finance before any other approval.",
                    )
            elif expense.status == ExpenseStatus.supervisor_approved:
                # Legacy: a supervisor may have approved before this change was deployed.
                # Finance (or admin) can still move it forward.
                if role in ("finance_officer", "finance", "admin", "super_admin"):
                    expense.status = ExpenseStatus.finance_approved
                    expense.finance_id = actor_id
                    expense.finance_approved_at = now
                else:
                    raise HTTPException(
                        403,
                        "Only Finance or Admin can advance a supervisor-approved expense.",
                    )
            elif expense.status == ExpenseStatus.finance_approved:
                if role in ("admin", "super_admin"):
                    expense.status = ExpenseStatus.admin_approved
                    expense.updated_at = now
                else:
                    raise HTTPException(
                        403,
                        "Only Admin can give final approval after Finance has validated.",
                    )
            else:
                raise HTTPException(
                    400,
                    f"Cannot approve expense in status '{expense.status}' (role: '{role}').",
                )
        elif action == ApprovalAction.rejected:
            # Finance and Admin can reject at their respective stages.
            # Supervisors can no longer reject expenses.
            if expense.status == ExpenseStatus.submitted and role not in (*_ADMIN_ROLES, "finance_officer", "finance"):
                raise HTTPException(403, "Only Finance or Admin can reject a submitted expense")
            if expense.status == ExpenseStatus.supervisor_approved and role not in (*_ADMIN_ROLES, "finance_officer", "finance"):
                raise HTTPException(403, "Only Finance or Admin can reject a supervisor-approved expense")
            if expense.status == ExpenseStatus.finance_approved and role not in _ADMIN_ROLES:
                raise HTTPException(403, "Only Admin can reject at the final approval stage")
            if expense.status not in (
                ExpenseStatus.submitted,
                ExpenseStatus.supervisor_approved,
                ExpenseStatus.finance_approved,
            ):
                raise HTTPException(400, f"Cannot reject expense in status '{expense.status}'")
            expense.status           = ExpenseStatus.rejected
            expense.rejected_by      = actor_id
            expense.rejection_reason = rejection_reason

    elif module == ApprovalModule.document:
        from app.modules.documents.model import Document, DocumentStatus

        doc = await db.get(Document, ref_id)
        if not doc:
            raise HTTPException(404, "Document not found")
        if role not in (*_ADMIN_ROLES, "supervisor"):
            raise HTTPException(403, "Only a supervisor or admin can approve/reject documents")
        if doc.status not in (DocumentStatus.review, DocumentStatus.signing):
            raise HTTPException(400, f"Document cannot be approved from status '{doc.status}'")

        if action == ApprovalAction.approved:
            doc.status      = DocumentStatus.approved
            doc.approved_by = actor_id
            doc.approved_at = now
        elif action == ApprovalAction.rejected:
            doc.status           = DocumentStatus.rejected
            doc.rejection_reason = rejection_reason

    elif module == ApprovalModule.service_call:
        from app.modules.service_calls.model import ServiceCall, ServiceStatus

        call = await db.get(ServiceCall, ref_id)
        if not call:
            raise HTTPException(404, "Service call not found")
        if role not in (*_ADMIN_ROLES, "service_coordinator", "coordinator", "supervisor"):
            raise HTTPException(403, "Only a coordinator, supervisor, or admin can close/escalate service calls")

        if action == ApprovalAction.approved:
            if call.status != ServiceStatus.resolved:
                raise HTTPException(400, f"Service call must be resolved before closure (status: {call.status})")
            call.status    = ServiceStatus.closed
            call.closed_at = now
        elif action == ApprovalAction.escalated:
            if call.status in (ServiceStatus.closed, ServiceStatus.resolved):
                raise HTTPException(400, "Cannot escalate a resolved or closed service call")
            call.status = ServiceStatus.escalated
        elif action == ApprovalAction.rejected:
            if call.status != ServiceStatus.resolved:
                raise HTTPException(400, f"Can only reject closure for resolved calls (status: {call.status})")
            call.status = ServiceStatus.escalated


class ApprovalService:

    @staticmethod
    async def create(
        db: AsyncSession, data: ApprovalCreate, current_user: TokenUser, request: Request,
    ) -> ApprovalResponse:
        if current_user.role not in _APPROVER_ROLES:
            raise HTTPException(403, f"Role '{current_user.role}' is not permitted to perform approvals")

        actor_id = UUID(current_user.id)
        now      = datetime.now(UTC)

        # Mutate the referenced record inside its own module
        await _apply_to_module(
            db, data.module, data.ref_id, data.action,
            data.rejection_reason, actor_id, current_user.role, now,
        )

        digest = generate_hash(data.ref_id, current_user.id, data.action.value, now)

        log = ApprovalLog(
            module           = data.module,
            ref_id           = data.ref_id,
            actor_id         = actor_id,
            action           = data.action,
            signature_type   = data.signature_type,
            signature_data   = data.signature_data,
            rejection_reason = data.rejection_reason,
            ip_address       = request.client.host if request.client else None,
            user_agent       = (request.headers.get("user-agent") or "")[:500],
            timestamp        = now,
            hash             = digest,
        )
        db.add(log)
        await db.commit()
        await db.refresh(log)
        return await ApprovalService._to_response(db, log)

    @staticmethod
    async def get_history(
        db: AsyncSession, ref_id: UUID, current_user: TokenUser, module: ApprovalModule | None = None,
    ) -> list[ApprovalResponse]:
        query = select(ApprovalLog).where(ApprovalLog.ref_id == ref_id)
        if module:
            query = query.where(ApprovalLog.module == module)

        result = await db.execute(query.order_by(ApprovalLog.timestamp.asc()))
        return [await ApprovalService._to_response(db, log) for log in result.scalars().all()]

    @staticmethod
    async def _to_response(db: AsyncSession, log: ApprovalLog) -> ApprovalResponse:
        actor = await db.get(User, log.actor_id)
        return ApprovalResponse.model_validate(log).model_copy(
            update={
                "actor_name":  actor.full_name if actor else None,
                "actor_email": actor.email     if actor else None,
                "actor_role":  actor.role.value if actor else None,
            }
        )

    @staticmethod
    def verify_hash(log: ApprovalLog) -> bool:
        """Returns True if the log record has not been tampered with."""
        expected = generate_hash(
            str(log.ref_id), str(log.actor_id), log.action.value, log.timestamp,
        )
        return log.hash == expected


async def create_approval(
    db: AsyncSession,
    user: TokenUser,
    data: ApprovalCreate,
    request: Request,
) -> ApprovalResponse:
    return await ApprovalService.create(db, data, user, request)
