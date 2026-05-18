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

USERS = [
    {
        "email": "admin@company.com",
        "password": "Admin@1234",
        "full_name": "System Admin",
        "department": "IT",
        "designation": "System Administrator",
        "role": "admin",
    },
    {
        "email": "manager@company.com",
        "password": "Manager@1234",
        "full_name": "Field Manager",
        "department": "Operations",
        "designation": "Field Operations Manager",
        "role": "manager",
    },
    {
        "email": "agent@company.com",
        "password": "Agent@1234",
        "full_name": "Field Agent",
        "department": "Field",
        "designation": "Field Technician",
        "role": "agent",
    },
]


async def get_or_create_role(db: AsyncSession, name: str, description: str) -> Role:
    result = await db.execute(select(Role).where(Role.name == name))
    role = result.scalar_one_or_none()
    if not role:
        role = Role(name=name, description=description)
        db.add(role)
        await db.flush()
        print(f"  Created role: {name}")
    else:
        print(f"  Role exists : {name}")
    return role


async def get_or_create_user(db: AsyncSession, data: dict) -> User:
    result = await db.execute(select(User).where(User.email == data["email"]))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            full_name=data["full_name"],
            email=data["email"],
            department=data["department"],
            designation=data["designation"],
            password_hash=hash_password(data["password"]),
            is_active=True,
        )
        db.add(user)
        await db.flush()
        print(f"  Created user: {data['email']}")
    else:
        print(f"  User exists : {data['email']}")
    return user


async def assign_role(db: AsyncSession, user: User, role: Role) -> None:
    result = await db.execute(
        select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
    )
    if not result.scalar_one_or_none():
        db.add(UserRole(user_id=user.id, role_id=role.id))
        print(f"  Assigned role '{role.name}' to {user.email}")


ROLE_DESCRIPTIONS = {
    "admin": "Full system access",
    "manager": "Assign tasks and service calls, approve work",
    "agent": "Execute assigned tasks and service calls",
}


async def seed() -> None:
    async with SessionLocal() as db:
        for entry in USERS:
            role = await get_or_create_role(db, entry["role"], ROLE_DESCRIPTIONS[entry["role"]])
            user = await get_or_create_user(db, entry)
            await assign_role(db, user, role)

        await db.commit()

    print("\nSeed complete.\n")
    print(f"{'Email':<30} {'Password':<20} {'Role'}")
    print("-" * 60)
    for entry in USERS:
        print(f"{entry['email']:<30} {entry['password']:<20} {entry['role']}")

    await engine.dispose()


asyncio.run(seed())
