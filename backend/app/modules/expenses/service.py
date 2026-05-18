from datetime import datetime, UTC
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import check_permission, has_permission
from app.core.security import TokenUser
from app.modules.audit_log.service import AuditLogService
from app.modules.expenses.model import (
    FINANCE_APPROVAL_THRESHOLD,
    Expense,
    ExpenseStatus,
)
from app.modules.expenses.repository import ExpenseRepository
from app.modules.expenses.schema import ExpenseCreate, ExpenseReject, ExpenseUpdate
from app.modules.notifications.service import NotificationService


async def _fetch(db: AsyncSession, expense_id: UUID) -> Expense:
    expense = await ExpenseRepository.get_by_id(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


class ExpenseService:

    # ------------------------------------------------------------------
    # Employee actions
    # ------------------------------------------------------------------

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
            db, actor_id=UUID(current_user.id), module="expenses",
            action="expense_created", record_id=str(expense.id),
            after_data={"title": expense.title, "amount": str(expense.amount)},
        )
        return expense

    @staticmethod
    async def submit(db: AsyncSession, expense_id: UUID, current_user: TokenUser) -> Expense:
        check_permission(current_user, "expenses", "own")
        expense = await _fetch(db, expense_id)

        if expense.submitted_by != UUID(current_user.id) and not has_permission(current_user, "expenses", "full"):
            raise HTTPException(status_code=403, detail="You can only submit your own expenses")

        if expense.status != ExpenseStatus.draft:
            raise HTTPException(status_code=400, detail="Only draft expenses can be submitted")

        expense.status = ExpenseStatus.pending
        expense.submitted_at = datetime.now(UTC)
        expense.updated_at = datetime.now(UTC)

        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="expenses",
            action="expense_submitted", record_id=str(expense.id),
            after_data={"amount": str(expense.amount), "category": expense.category},
        )
        return await ExpenseRepository.save(db, expense)

    @staticmethod
    async def update(
        db: AsyncSession, expense_id: UUID, data: ExpenseUpdate, current_user: TokenUser,
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

    # ------------------------------------------------------------------
    # Supervisor action — approves pending expenses
    # ------------------------------------------------------------------

    @staticmethod
    async def supervisor_approve(
        db: AsyncSession, expense_id: UUID, current_user: TokenUser,
    ) -> Expense:
        # supervisor, admin, super_admin have at least "view" on expenses
        check_permission(current_user, "expenses", "view")

        expense = await _fetch(db, expense_id)

        if expense.status != ExpenseStatus.pending:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot approve: expense is '{expense.status}', expected 'pending'",
            )

        actor_id = UUID(current_user.id)
        expense.supervisor_id = actor_id
        expense.supervisor_approved_at = datetime.now(UTC)
        expense.updated_at = datetime.now(UTC)

        if expense.amount > FINANCE_APPROVAL_THRESHOLD:
            # Large amount — requires Finance sign-off next
            expense.status = ExpenseStatus.supervisor_approved
        else:
            # Small amount — skip Finance, go straight to approved
            expense.status = ExpenseStatus.finance_approved
            expense.finance_approved_at = datetime.now(UTC)

        await NotificationService.send_email(
            to=str(expense.submitted_by),
            subject="Expense Approved by Supervisor",
            body=(
                f"Your expense '{expense.title}' (${expense.amount}) was approved by your supervisor."
                + (" Forwarded to Finance for final approval." if expense.amount > FINANCE_APPROVAL_THRESHOLD else "")
            ),
        )

        await AuditLogService.log(
            db, actor_id=actor_id, module="expenses",
            action="supervisor_approved", record_id=str(expense.id),
            after_data={"status": expense.status, "amount": str(expense.amount)},
        )
        return await ExpenseRepository.save(db, expense)

    # ------------------------------------------------------------------
    # Finance action — final approval for large expenses
    # ------------------------------------------------------------------

    @staticmethod
    async def finance_approve(
        db: AsyncSession, expense_id: UUID, current_user: TokenUser,
    ) -> Expense:
        check_permission(current_user, "expenses", "full")

        expense = await _fetch(db, expense_id)

        if expense.status != ExpenseStatus.supervisor_approved:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot finance-approve: expense is '{expense.status}', expected 'supervisor_approved'",
            )

        actor_id = UUID(current_user.id)
        expense.finance_id = actor_id
        expense.finance_approved_at = datetime.now(UTC)
        expense.status = ExpenseStatus.finance_approved
        expense.updated_at = datetime.now(UTC)

        await NotificationService.send_email(
            to=str(expense.submitted_by),
            subject="Expense Finance-Approved",
            body=f"Your expense '{expense.title}' (${expense.amount}) received final Finance approval.",
        )

        await AuditLogService.log(
            db, actor_id=actor_id, module="expenses",
            action="finance_approved", record_id=str(expense.id),
            after_data={"status": expense.status},
        )
        return await ExpenseRepository.save(db, expense)

    # ------------------------------------------------------------------
    # Reject — usable at any approval stage by the right roles
    # ------------------------------------------------------------------

    @staticmethod
    async def reject(
        db: AsyncSession, expense_id: UUID, data: ExpenseReject, current_user: TokenUser,
    ) -> Expense:
        # Supervisor or Finance or Admin can reject
        check_permission(current_user, "expenses", "view")

        expense = await _fetch(db, expense_id)

        rejectable = {ExpenseStatus.pending, ExpenseStatus.supervisor_approved}
        if expense.status not in rejectable:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reject an expense with status '{expense.status}'",
            )

        actor_id = UUID(current_user.id)
        expense.status = ExpenseStatus.rejected
        expense.rejected_by = actor_id
        expense.rejection_reason = data.reason
        expense.updated_at = datetime.now(UTC)

        await NotificationService.send_email(
            to=str(expense.submitted_by),
            subject="Expense Rejected",
            body=f"Your expense '{expense.title}' was rejected. Reason: {data.reason}",
        )

        await AuditLogService.log(
            db, actor_id=actor_id, module="expenses",
            action="expense_rejected", record_id=str(expense.id),
            after_data={"reason": data.reason},
        )
        return await ExpenseRepository.save(db, expense)

    # ------------------------------------------------------------------
    # Finance — mark reimbursed after finance_approved
    # ------------------------------------------------------------------

    @staticmethod
    async def reimburse(
        db: AsyncSession, expense_id: UUID, current_user: TokenUser,
    ) -> Expense:
        check_permission(current_user, "expenses", "full")

        expense = await _fetch(db, expense_id)

        if expense.status != ExpenseStatus.finance_approved:
            raise HTTPException(
                status_code=400,
                detail="Only finance_approved expenses can be reimbursed",
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

        await AuditLogService.log(
            db, actor_id=actor_id, module="expenses",
            action="expense_reimbursed", record_id=str(expense.id),
            after_data={"reimbursed_at": str(expense.reimbursed_at)},
        )
        return await ExpenseRepository.save(db, expense)

    # ------------------------------------------------------------------
    # Read operations
    # ------------------------------------------------------------------

    @staticmethod
    async def get_all(db: AsyncSession, current_user: TokenUser) -> list[Expense]:
        check_permission(current_user, "expenses", "read")
        if has_permission(current_user, "expenses", "own") and not has_permission(current_user, "expenses", "view"):
            return await ExpenseRepository.get_by_user(db, UUID(current_user.id))
        return await ExpenseRepository.get_all(db)

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
