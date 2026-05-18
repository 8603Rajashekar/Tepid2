import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.models.role import Role, UserRole
from app.models.user import User

engine = create_async_engine(settings.DATABASE_URL)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

ADMIN_EMAIL = "admin@company.com"
ADMIN_PASSWORD = "Admin@1234"
ADMIN_NAME = "System Admin"
ADMIN_DEPARTMENT = "IT"
ADMIN_ROLE = "admin"


async def seed():
    async with SessionLocal() as db:
        # Create role if missing
        result = await db.execute(select(Role).where(Role.name == ADMIN_ROLE))
        role = result.scalar_one_or_none()
        if not role:
            role = Role(name=ADMIN_ROLE, description="Full system access")
            db.add(role)
            await db.flush()
            print(f"Created role: {ADMIN_ROLE}")
        else:
            print(f"Role already exists: {ADMIN_ROLE}")

        # Create admin user if missing
        result = await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                full_name=ADMIN_NAME,
                email=ADMIN_EMAIL,
                department=ADMIN_DEPARTMENT,
                designation="System Administrator",
                password_hash=hash_password(ADMIN_PASSWORD),
                is_active=True,
            )
            db.add(user)
            await db.flush()
            print(f"Created admin user: {ADMIN_EMAIL}")
        else:
            print(f"Admin user already exists: {ADMIN_EMAIL}")

        # Assign role if not already assigned
        result = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.role_id == role.id,
            )
        )
        if not result.scalar_one_or_none():
            db.add(UserRole(user_id=user.id, role_id=role.id))
            print(f"Assigned role '{ADMIN_ROLE}' to {ADMIN_EMAIL}")

        await db.commit()
        print("\nSeed complete.")
        print(f"  Email:    {ADMIN_EMAIL}")
        print(f"  Password: {ADMIN_PASSWORD}")
        print("\nSet AUTH_MOCK_ENABLED=False in .env to require real JWT tokens.")

    await engine.dispose()


asyncio.run(seed())
