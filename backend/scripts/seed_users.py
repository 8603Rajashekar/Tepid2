import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models.role import Role, UserRole
from app.models.user import User

engine = create_async_engine(settings.DATABASE_URL)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

ROLE_DESCRIPTIONS = {
    "super_admin":  "Unrestricted access to the entire platform",
    "admin":        "Full operational access; cannot change system config",
    "supervisor":   "Manages a team — can view/approve team tasks",
    "coordinator":  "Manages service calls from open to close",
    "finance":      "Full access to expense records",
    "employee":     "Works on their own assigned tasks and service calls",
    "viewer":       "Read-only access across all modules",
}

USERS = [
    {
        "email":       "super_admin@company.com",
        "password":    "SuperAdmin@1234",
        "full_name":   "Super Administrator",
        "department":  "IT",
        "designation": "Platform Owner",
        "role":        "super_admin",
    },
    {
        "email":       "admin@company.com",
        "password":    "Admin@1234",
        "full_name":   "System Admin",
        "department":  "IT",
        "designation": "System Administrator",
        "role":        "admin",
    },
    {
        "email":       "supervisor@company.com",
        "password":    "Supervisor@1234",
        "full_name":   "Team Supervisor",
        "department":  "Operations",
        "designation": "Field Supervisor",
        "role":        "supervisor",
    },
    {
        "email":       "coordinator@company.com",
        "password":    "Coordinator@1234",
        "full_name":   "Call Coordinator",
        "department":  "Support",
        "designation": "Service Coordinator",
        "role":        "coordinator",
    },
    {
        "email":       "finance@company.com",
        "password":    "Finance@1234",
        "full_name":   "Finance Officer",
        "department":  "Finance",
        "designation": "Finance Manager",
        "role":        "finance",
    },
    {
        "email":       "employee@company.com",
        "password":    "Employee@1234",
        "full_name":   "Field Employee",
        "department":  "Field",
        "designation": "Field Technician",
        "role":        "employee",
    },
    {
        "email":       "viewer@company.com",
        "password":    "Viewer@1234",
        "full_name":   "Read Only Viewer",
        "department":  "Reporting",
        "designation": "Auditor",
        "role":        "viewer",
    },
]


async def get_or_create_role(db: AsyncSession, name: str) -> Role:
    result = await db.execute(select(Role).where(Role.name == name))
    role = result.scalar_one_or_none()
    if not role:
        role = Role(name=name, description=ROLE_DESCRIPTIONS.get(name, name))
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


async def seed() -> None:
    async with SessionLocal() as db:
        for entry in USERS:
            role = await get_or_create_role(db, entry["role"])
            user = await get_or_create_user(db, entry)
            await assign_role(db, user, role)

        await db.commit()

    print("\nSeed complete.\n")
    print(f"{'Email':<35} {'Password':<20} {'Role'}")
    print("-" * 70)
    for entry in USERS:
        print(f"{entry['email']:<35} {entry['password']:<20} {entry['role']}")

    await engine.dispose()


asyncio.run(seed())
