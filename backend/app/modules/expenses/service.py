from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import check_permission, has_permission, require_role
from app.core.security import TokenUser
from app.modules.approvals.model import ApprovalAction, ApprovalModule
from app.modules.approvals.schema import ApprovalCreate
from app.modules.approvals.service import create_approval
from app.modules.audit_log.service import AuditLogService
from app.modules.expenses.model import (
    FINANCE_APPROVAL_THRESHOLD,
    Expense,
    ExpenseStatus,
)
from app.modules.expenses.repository import ExpenseRepository
from app.modules.expenses.schema import ExpenseCreate, ExpenseUpdate
from app.modules.analytics.ws import manager as ws_manager
from app.modules.notifications.service import NotificationService, create_notification


async def _fetch(db: AsyncSession, expense_id: UUID) -> Expense:
    expense = await ExpenseRepository.get_by_id(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


def _ensure_expense_approval_payload(
    *,
    data: ApprovalCreate,
    expense_id: UUID,
    action: ApprovalAction,
) -> ApprovalCreate:
    if data.module != ApprovalModule.expense:
        raise HTTPException(status_code=400, detail="Approval module must be 'expense'")
    if data.ref_id != expense_id:
        raise HTTPException(status_code=400, detail="Approval ref_id must match the expense id")
    if data.action != action:
        raise HTTPException(status_code=400, detail=f"Approval action must be '{action.value}'")
    return data


class ExpenseService:
    @staticmethod
    async def create(db: AsyncSession, data: ExpenseCreate, current_user: TokenUser) -> Expense:
        check_permission(current_user, "expenses", "own")

        expense = Expense(
            **data.model_dump(),
            submitted_by=UUID(current_user.id),
            status=ExpenseStatus.draft,
            updated_at=datetime.now(UTC),
        )
        expense = await ExpenseRepository.create(db, expense)

        await AuditLogService.log(
            db,
            actor_id=UUID(current_user.id),
            module="expenses",
            action="expense_created",
            record_id=str(expense.id),
            after_data={"title": expense.title, "amount": str(expense.amount)},
        )
        await db.commit()
        return expense

    @staticmethod
    async def submit(db: AsyncSession, expense_id: UUID, current_user: TokenUser) -> Expense:
        check_permission(current_user, "expenses", "own")
        expense = await _fetch(db, expense_id)

        if expense.submitted_by != UUID(current_user.id) and not has_permission(current_user, "expenses", "full"):
            raise HTTPException(status_code=403, detail="You can only submit your own expenses")

        if expense.status != ExpenseStatus.draft:
            raise HTTPException(status_code=400, detail="Only draft expenses can be submitted")

        if float(expense.amount) > 999 and not expense.receipt_url:
            raise HTTPException(
                status_code=400,
                detail="A supporting document is required for expenses above ₹999. Please attach a receipt before submitting.",
            )

        expense.status = ExpenseStatus.submitted
        expense.submitted_at = datetime.now(UTC)
        expense.updated_at = datetime.now(UTC)

        await AuditLogService.log(
            db,
            actor_id=UUID(current_user.id),
            module="expenses",
            action="expense_submitted",
            record_id=str(expense.id),
            after_data={"amount": str(expense.amount), "category": expense.category},
        )
        return await ExpenseRepository.save(db, expense)

    @staticmethod
    async def update(
        db: AsyncSession,
        expense_id: UUID,
        data: ExpenseUpdate,
        current_user: TokenUser,
    ) -> Expense:
        check_permission(current_user, "expenses", "own")
        expense = await _fetch(db, expense_id)

        if expense.submitted_by != UUID(current_user.id) and not has_permission(current_user, "expenses", "full"):
            raise HTTPException(status_code=403, detail="You can only edit your own expenses")

        if expense.status != ExpenseStatus.draft:
            raise HTTPException(status_code=400, detail="Only draft expenses can be edited")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(expense, field, value)
        expense.updated_at = datetime.now(UTC)

        return await ExpenseRepository.save(db, expense)

    @staticmethod
    async def attach_receipt(
        db: AsyncSession,
        expense_id: UUID,
        receipt_url: str,
        current_user: TokenUser,
    ) -> Expense:
        expense = await _fetch(db, expense_id)

        if expense.submitted_by != UUID(current_user.id) and not has_permission(current_user, "expenses", "full"):
            raise HTTPException(status_code=403, detail="You can only attach receipts to your own expenses")

        if expense.status not in (ExpenseStatus.draft, ExpenseStatus.submitted):
            raise HTTPException(status_code=400, detail="Cannot attach receipt to an expense that is already in approval")

        expense.receipt_url = receipt_url
        expense.updated_at = datetime.now(UTC)
        return await ExpenseRepository.save(db, expense)

    @staticmethod
    async def supervisor_approve(
        db: AsyncSession,
        expense_id: UUID,
        data: ApprovalCreate,
        current_user: TokenUser,
        request: Request,
    ) -> Expense:
        require_role(current_user, "supervisor")
        expense = await _fetch(db, expense_id)

        if expense.status != ExpenseStatus.submitted:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot approve: expense is '{expense.status.value}', expected 'submitted'",
            )

        actor_id = UUID(current_user.id)
        data = _ensure_expense_approval_payload(
            data=data,
            expense_id=expense.id,
            action=ApprovalAction.approved,
        )
        await create_approval(db=db, user=current_user, data=data, request=request)

        expense = await _fetch(db, expense_id)
        expense.updated_at = datetime.now(UTC)

        await NotificationService.send_email(
            to=str(expense.submitted_by),
            subject="Expense Approved by Supervisor",
            body=(
                f"Your expense '{expense.title}' (${expense.amount}) was approved by your supervisor."
                + (" Forwarded to Finance for final approval." if expense.amount > FINANCE_APPROVAL_THRESHOLD else "")
            ),
        )
        await create_notification(expense.submitted_by, f"💸 Expense approved by supervisor: {expense.title}")
        await AuditLogService.log(
            db,
            actor_id=actor_id,
            module="expenses",
            action="supervisor_approved",
            record_id=str(expense.id),
            after_data={"status": expense.status, "amount": str(expense.amount)},
        )
        await db.commit()
        await db.refresh(expense)
        await ws_manager.broadcast({"type": "expense_update", "action": "supervisor_approved"})
        return expense

    @staticmethod
    async def finance_approve(
        db: AsyncSession,
        expense_id: UUID,
        data: ApprovalCreate,
        current_user: TokenUser,
        request: Request,
    ) -> Expense:
        require_role(current_user, "finance_officer", "finance")
        expense = await _fetch(db, expense_id)

        if expense.status not in (ExpenseStatus.submitted, ExpenseStatus.supervisor_approved):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot finance-approve: expense is '{expense.status.value}', expected 'submitted' or 'supervisor_approved'",
            )

        data = _ensure_expense_approval_payload(
            data=data,
            expense_id=expense.id,
            action=ApprovalAction.approved,
        )
        await create_approval(db=db, user=current_user, data=data, request=request)

        expense = await _fetch(db, expense_id)
        expense.updated_at = datetime.now(UTC)

        await NotificationService.send_email(
            to=str(expense.submitted_by),
            subject="Expense Finance Validated",
            body=f"Your expense '{expense.title}' (${expense.amount}) was validated by Finance. Awaiting admin final approval.",
        )
        await create_notification(expense.submitted_by, f"💸 Expense finance-validated: {expense.title} — awaiting admin approval")
        await AuditLogService.log(
            db,
            actor_id=UUID(current_user.id),
            module="expenses",
            action="finance_approved",
            record_id=str(expense.id),
            after_data={"status": expense.status},
        )
        await db.commit()
        await db.refresh(expense)
        await ws_manager.broadcast({"type": "expense_update", "action": "finance_approved"})
        return expense

    @staticmethod
    async def admin_approve(
        db: AsyncSession,
        expense_id: UUID,
        data: ApprovalCreate,
        current_user: TokenUser,
        request: Request,
    ) -> Expense:
        require_role(current_user)  # admin/super_admin only (require_role with no extra roles)
        expense = await _fetch(db, expense_id)

        if expense.status != ExpenseStatus.finance_approved:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot admin-approve: expense is '{expense.status.value}', expected 'finance_approved'",
            )

        data = _ensure_expense_approval_payload(
            data=data,
            expense_id=expense.id,
            action=ApprovalAction.approved,
        )
        await create_approval(db=db, user=current_user, data=data, request=request)

        expense = await _fetch(db, expense_id)
        expense.status = ExpenseStatus.admin_approved
        expense.updated_at = datetime.now(UTC)

        await NotificationService.send_email(
            to=str(expense.submitted_by),
            subject="Expense Final Approval",
            body=f"Your expense '{expense.title}' (${expense.amount}) received final admin approval and will be reimbursed.",
        )
        await create_notification(expense.submitted_by, f"✅ Expense finally approved: {expense.title} — will be reimbursed")
        await AuditLogService.log(
            db,
            actor_id=UUID(current_user.id),
            module="expenses",
            action="admin_approved",
            record_id=str(expense.id),
            after_data={"status": expense.status},
        )
        await db.commit()
        await db.refresh(expense)
        await ws_manager.broadcast({"type": "expense_update", "action": "admin_approved"})
        return expense

    @staticmethod
    async def reject(
        db: AsyncSession,
        expense_id: UUID,
        data: ApprovalCreate,
        current_user: TokenUser,
        request: Request,
    ) -> Expense:
        expense = await _fetch(db, expense_id)
        rejectable = {ExpenseStatus.submitted, ExpenseStatus.supervisor_approved, ExpenseStatus.finance_approved}
        if expense.status not in rejectable:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reject an expense with status '{expense.status.value}'",
            )

        actor_id = UUID(current_user.id)
        data = _ensure_expense_approval_payload(
            data=data,
            expense_id=expense.id,
            action=ApprovalAction.rejected,
        )
        await create_approval(db=db, user=current_user, data=data, request=request)

        expense = await _fetch(db, expense_id)
        expense.updated_at = datetime.now(UTC)

        await NotificationService.send_email(
            to=str(expense.submitted_by),
            subject="Expense Rejected",
            body=f"Your expense '{expense.title}' was rejected. Reason: {data.rejection_reason}",
        )
        await create_notification(expense.submitted_by, f"❌ Expense rejected: {expense.title}")
        await AuditLogService.log(
            db,
            actor_id=actor_id,
            module="expenses",
            action="expense_rejected",
            record_id=str(expense.id),
            after_data={"reason": data.rejection_reason},
        )
        await db.commit()
        await db.refresh(expense)
        return expense

    @staticmethod
    async def reimburse(
        db: AsyncSession,
        expense_id: UUID,
        current_user: TokenUser,
    ) -> Expense:
        require_role(current_user, "finance_officer", "finance")
        check_permission(current_user, "expenses", "full")

        expense = await _fetch(db, expense_id)
        if expense.status != ExpenseStatus.admin_approved:
            raise HTTPException(
                status_code=400,
                detail="Only admin_approved expenses can be reimbursed",
            )

        actor_id = UUID(current_user.id)
        expense.status = ExpenseStatus.reimbursed
        expense.reimbursed_at = datetime.now(UTC)
        expense.updated_at = datetime.now(UTC)

        await NotificationService.send_email(
            to=str(expense.submitted_by),
            subject="Expense Reimbursed",
            body=f"Your expense '{expense.title}' (${expense.amount}) has been reimbursed.",
        )
        await create_notification(expense.submitted_by, f"💰 Expense reimbursed: {expense.title} (₹{expense.amount})")
        await AuditLogService.log(
            db,
            actor_id=actor_id,
            module="expenses",
            action="expense_reimbursed",
            record_id=str(expense.id),
            after_data={"reimbursed_at": str(expense.reimbursed_at)},
        )
        return await ExpenseRepository.save(db, expense)

    @staticmethod
    async def get_all(db: AsyncSession, current_user: TokenUser) -> list[Expense]:
        check_permission(current_user, "expenses", "read")
        if has_permission(current_user, "expenses", "own") and not has_permission(current_user, "expenses", "view"):
            return await ExpenseRepository.get_by_user(db, UUID(current_user.id))
        return await ExpenseRepository.get_all(db)

    @staticmethod
    async def get_pending_approval(db: AsyncSession, current_user: TokenUser) -> list[Expense]:
        """Return expenses relevant to the current approver's role in the flow."""
        role = current_user.role
        all_expenses = await ExpenseRepository.get_all(db)
        if role in ("finance", "finance_officer"):
            return [e for e in all_expenses if e.status in (ExpenseStatus.submitted, ExpenseStatus.supervisor_approved)]
        if role in ("admin", "super_admin"):
            return [e for e in all_expenses if e.status == ExpenseStatus.finance_approved]
        return []

    @staticmethod
    async def get_my(db: AsyncSession, current_user: TokenUser) -> list[Expense]:
        check_permission(current_user, "expenses", "own")
        return await ExpenseRepository.get_by_user(db, UUID(current_user.id))

    @staticmethod
    async def get_one(db: AsyncSession, expense_id: UUID, current_user: TokenUser) -> Expense:
        check_permission(current_user, "expenses", "read")
        expense = await _fetch(db, expense_id)
        if has_permission(current_user, "expenses", "own") and not has_permission(current_user, "expenses", "view"):
            if expense.submitted_by != UUID(current_user.id):
                raise HTTPException(status_code=403, detail="You can only view your own expenses")
        return expense
