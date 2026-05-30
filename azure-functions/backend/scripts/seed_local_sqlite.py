import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.models.role import Role, UserRole as LegacyUserRole
from app.models.user import User, UserRole
from app.modules.approvals.model import ApprovalLog
from app.modules.crm.model import CRMCall
from app.modules.documents.model import Document
from app.modules.expenses.model import Expense
from app.modules.notifications.model import Notification
from app.modules.service_calls.model import ServiceCall
from app.modules.tasks.model import Task
from app.modules.tracking.model import TaskLocation
from app.modules.work_reports.model import WorkReport


USERS = [
    ("admin@company.com", "Administrator", UserRole.admin, "IT", "System Administrator"),
    ("supervisor@company.com", "Team Supervisor", UserRole.supervisor, "Operations", "Field Supervisor"),
    ("coordinator@company.com", "Call Coordinator", UserRole.coordinator, "Support", "Service Coordinator"),
    ("finance@company.com", "Finance Officer", UserRole.finance, "Finance", "Finance Manager"),
    ("employee@company.com", "Field Employee", UserRole.employee, "Field", "Field Technician"),
    ("crm@company.com", "CRM Agent", UserRole.crm, "Sales", "CRM Executive"),
]


async def main() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        for email, full_name, role, department, designation in USERS:
            existing = (
                await db.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
            if existing:
                existing.full_name = full_name
                existing.role = role
                existing.department = department
                existing.designation = designation
                existing.password_hash = hash_password("Password@123")
                existing.is_active = True
                continue

            db.add(
                User(
                    email=email,
                    full_name=full_name,
                    role=role,
                    department=department,
                    designation=designation,
                    password_hash=hash_password("Password@123"),
                    is_active=True,
                )
            )

        await db.commit()

    await engine.dispose()
    print("Local SQLite dev database is ready.")
    print("Password for all seeded users: Password@123")


if __name__ == "__main__":
    asyncio.run(main())
