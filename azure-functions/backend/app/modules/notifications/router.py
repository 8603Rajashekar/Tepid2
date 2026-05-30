from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.notifications.model import Notification
from app.modules.notifications.schema import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[NotificationOut])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Return the current user's notifications, newest first (max 50)."""
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == UUID(current_user.id))
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.patch("/{notif_id}/read", response_model=NotificationOut)
async def mark_read(
    notif_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notif = await db.get(Notification, notif_id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.user_id != UUID(current_user.id):
        raise HTTPException(status_code=403, detail="Not your notification")
    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Return the count of unread notifications for the bell badge."""
    count = await db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == UUID(current_user.id))
        .where(Notification.is_read == False)  # noqa: E712
    )
    return {"unread": count or 0}


@router.post("/read-all", status_code=204)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Mark every unread notification for this user as read."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == UUID(current_user.id))
        .where(Notification.is_read == False)  # noqa: E712
        .values(is_read=True)
    )
    await db.commit()
