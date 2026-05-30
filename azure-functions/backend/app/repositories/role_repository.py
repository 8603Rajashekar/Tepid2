from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role, UserRole


class RoleRepository:

    @staticmethod
    async def get_roles_for_user(db: AsyncSession, user_id: UUID) -> list[str]:
        result = await db.execute(
            select(Role.name)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id)
        )
        return list(result.scalars().all())
