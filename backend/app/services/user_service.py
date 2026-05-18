from datetime import datetime, UTC
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:

    @staticmethod
    async def get_users(db: AsyncSession):
        return await UserRepository.get_all(db)

    @staticmethod
    async def get_user(db: AsyncSession, user_id: UUID):
        user = await UserRepository.get_by_id(db, user_id)

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found",
            )

        return user

    @staticmethod
    async def create_user(
        db: AsyncSession,
        payload: UserCreate,
    ):
        existing_user = await UserRepository.get_by_email(
            db,
            payload.email,
        )

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already exists",
            )

        user = User(
            full_name=payload.full_name,
            email=payload.email,
            department=payload.department,
            designation=payload.designation,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
        )

        return await UserRepository.create(db, user)

    @staticmethod
    async def update_user(
        db: AsyncSession,
        user_id: UUID,
        payload: UserUpdate,
    ):
        user = await UserRepository.get_by_id(db, user_id)

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found",
            )

        update_data = payload.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(user, field, value)

        return await UserRepository.update(db, user)

    @staticmethod
    async def delete_user(
        db: AsyncSession,
        user_id: UUID,
    ):
        user = await UserRepository.get_by_id(db, user_id)

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found",
            )

        user.deleted_at = datetime.now(UTC)
        user.is_active = False

        await UserRepository.soft_delete(db)

        return {"message": "User deleted successfully"}
