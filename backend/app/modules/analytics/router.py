from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.tasks.model import Task
from app.modules.tracking.model import TaskLocation

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_overview(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    total      = await db.scalar(select(func.count()).select_from(Task))
    pending    = await db.scalar(select(func.count()).select_from(Task).where(Task.status == "pending"))
    in_progress = await db.scalar(select(func.count()).select_from(Task).where(Task.status == "in_progress"))
    completed  = await db.scalar(select(func.count()).select_from(Task).where(Task.status == "completed"))
    locations  = await db.scalar(select(func.count()).select_from(TaskLocation))

    return {
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "location_pings": locations,
    }
