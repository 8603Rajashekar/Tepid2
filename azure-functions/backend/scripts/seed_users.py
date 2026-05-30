import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole

engine = create_async_engine(settings.database_url)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

USERS = [
    # Both admin accounts use the same 'admin' role — full access
    {
        "email":       "admin@company.com",
        "password":    "Password@123",
        "full_name":   "Administrator",
        "department":  "IT",
        "designation": "System Administrator",
        "role":        UserRole.admin,
    },
    {
        "email":       "superadmin@company.com",
        "password":    "Password@123",
        "full_name":   "Administrator",
        "department":  "IT",
        "designation": "System Administrator",
        "role":        UserRole.admin,
    },
    {
        "email":       "supervisor@company.com",
        "password":    "Password@123",
        "full_name":   "Team Supervisor",
        "department":  "Operations",
        "designation": "Field Supervisor",
        "role":        UserRole.supervisor,
    },
    {
        "email":       "coordinator@company.com",
        "password":    "Password@123",
        "full_name":   "Call Coordinator",
        "department":  "Support",
        "designation": "Service Coordinator",
        "role":        UserRole.coordinator,
    },
    {
        "email":       "finance@company.com",
        "password":    "Password@123",
        "full_name":   "Finance Officer",
        "department":  "Finance",
        "designation": "Finance Manager",
        "role":        UserRole.finance,
    },
    {
        "email":       "employee@company.com",
        "password":    "Password@123",
        "full_name":   "Field Employee",
        "department":  "Field",
        "designation": "Field Technician",
        "role":        UserRole.employee,
    },
]


async def upsert_user(db: AsyncSession, data: dict) -> None:
    result = await db.execute(select(User).where(User.email == data["email"]))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            full_name=data["full_name"],
            email=data["email"],
            department=data["department"],
            designation=data["designation"],
            role=data["role"],
            password_hash=hash_password(data["password"]),
            is_active=True,
        )
        db.add(user)
        print(f"  Created: {data['email']} ({data['role'].value})")
    else:
        user.full_name = data["full_name"]
        user.department = data["department"]
        user.designation = data["designation"]
        user.role = data["role"]
        user.password_hash = hash_password(data["password"])
        user.is_active = True
        print(f"  Updated: {data['email']} -> role={data['role'].value}, password reset")


async def seed() -> None:
    async with SessionLocal() as db:
        for entry in USERS:
            await upsert_user(db, entry)
        await db.commit()

    print("\nSeed complete.\n")
    print(f"{'Email':<35} {'Password':<20} {'Role'}")
    print("-" * 75)
    for entry in USERS:
        print(f"{entry['email']:<35} {entry['password']:<20} {entry['role'].value}")

    await engine.dispose()


asyncio.run(seed())
