from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.expenses.model import Expense


class ExpenseRepository:

    @staticmethod
    async def create(db: AsyncSession, expense: Expense) -> Expense:
        db.add(expense)
        await db.commit()
        await db.refresh(expense)
        return expense

    @staticmethod
    async def get_all(db: AsyncSession) -> list[Expense]:
        result = await db.execute(select(Expense).order_by(Expense.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def get_by_user(db: AsyncSession, user_id: UUID) -> list[Expense]:
        result = await db.execute(
            select(Expense)
            .where(Expense.submitted_by == user_id)
            .order_by(Expense.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, expense_id: UUID) -> Expense | None:
        result = await db.execute(select(Expense).where(Expense.id == expense_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def save(db: AsyncSession, expense: Expense) -> Expense:
        await db.commit()
        await db.refresh(expense)
        return expense

    @staticmethod
    async def delete(db: AsyncSession, expense: Expense) -> None:
        await db.delete(expense)
        await db.commit()
