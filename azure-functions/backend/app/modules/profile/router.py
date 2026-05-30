import base64
import hashlib
import hmac
import uuid as _uuid
from datetime import UTC, datetime
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import TokenUser, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.modules.expenses.model import Expense, ExpenseStatus
from app.modules.notifications.model import Notification
from app.modules.tasks.model import Task

router = APIRouter(prefix="/profile", tags=["Profile"])

BLOB_CONTAINER = "profile-photos"
ALLOWED_IMAGE  = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


# ── Schemas ────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    full_name:   str | None = None
    phone:       str | None = None
    department:  str | None = None
    designation: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password:     str


# ── Helpers ────────────────────────────────────────────────────────────

async def _upload_blob(data: bytes, blob_name: str, content_type: str) -> str:
    conn_str = getattr(settings, "AZURE_STORAGE_CONNECTION_STRING", None)
    if not conn_str:
        raise HTTPException(status_code=500, detail="Storage not configured")

    parts = dict(p.split("=", 1) for p in conn_str.split(";") if "=" in p)
    account  = parts.get("AccountName", "")
    key_b64  = parts.get("AccountKey", "")
    date_str = datetime.now(UTC).strftime("%a, %d %b %Y %H:%M:%S GMT")
    cl       = str(len(data))
    url      = f"https://{account}.blob.core.windows.net/{BLOB_CONTAINER}/{blob_name}"

    string_to_sign = (
        f"PUT\n\n\n{cl}\n\n{content_type}\n\n\n\n\n\n\n"
        f"x-ms-blob-type:BlockBlob\nx-ms-date:{date_str}\nx-ms-version:2020-08-04\n"
        f"/{account}/{BLOB_CONTAINER}/{blob_name}"
    )
    sig = base64.b64encode(
        hmac.new(base64.b64decode(key_b64), string_to_sign.encode(), hashlib.sha256).digest()
    ).decode()

    headers = {
        "x-ms-date": date_str, "x-ms-version": "2020-08-04",
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": content_type, "Content-Length": cl,
        "Authorization": f"SharedKey {account}:{sig}",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.put(url, content=data, headers=headers, timeout=60)
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Photo upload failed: {resp.text[:200]}")
    return url


# ── Routes ─────────────────────────────────────────────────────────────

@router.get("/")
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    user_id = UUID(current_user.id)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Task stats
    tasks_res = await db.execute(select(Task).where(Task.assigned_to == user_id))
    tasks = tasks_res.scalars().all()
    completed = [t for t in tasks if t.status in ("completed", "closed")]
    pending   = [t for t in tasks if t.status not in ("completed", "closed", "rejected", "cancelled")]

    # Expense stats
    exp_res = await db.execute(select(Expense).where(Expense.submitted_by == user_id))
    expenses = exp_res.scalars().all()
    approved = [e for e in expenses if e.status in (
        ExpenseStatus.admin_approved, ExpenseStatus.reimbursed)]
    exp_pending = [e for e in expenses if e.status in (
        ExpenseStatus.submitted, ExpenseStatus.supervisor_approved, ExpenseStatus.finance_approved)]
    rejected = [e for e in expenses if e.status == ExpenseStatus.rejected]

    # Recent notifications (last 5)
    notif_res = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(5)
    )
    notifications = notif_res.scalars().all()

    # Recent tasks (last 5)
    recent_tasks = sorted(tasks, key=lambda t: t.created_at, reverse=True)[:5]

    # Recent expenses (last 5)
    recent_expenses = sorted(expenses, key=lambda e: e.created_at, reverse=True)[:5]

    return {
        "user": {
            "id":          str(user.id),
            "full_name":   user.full_name,
            "email":       user.email,
            "phone":       user.phone,
            "department":  user.department,
            "designation": user.designation,
            "role":        user.role.value,
            "avatar_url":  user.avatar_url,
            "created_at":  user.created_at.isoformat(),
        },
        "tasks": {
            "completed": len(completed),
            "pending":   len(pending),
            "total":     len(tasks),
            "efficiency": round(len(completed) / len(tasks) * 100) if tasks else 0,
        },
        "expenses": {
            "total":        len(expenses),
            "approved":     len(approved),
            "pending":      len(exp_pending),
            "rejected":     len(rejected),
            "total_amount": float(sum(e.amount for e in approved)),
        },
        "notifications": [
            {"id": str(n.id), "message": n.message,
             "is_read": n.is_read, "created_at": n.created_at.isoformat()}
            for n in notifications
        ],
        "recent_tasks": [
            {"id": str(t.id), "title": t.title, "status": t.status,
             "priority": t.priority,
             "due_date": t.due_date.isoformat() if getattr(t, "due_date", None) else None}
            for t in recent_tasks
        ],
        "recent_expenses": [
            {"id": str(e.id), "title": e.title, "amount": float(e.amount),
             "status": e.status, "category": e.category}
            for e in recent_expenses
        ],
    }


@router.patch("/")
async def update_profile(
    payload: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    user = await db.get(User, UUID(current_user.id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(user, field, val)
    await db.commit()
    await db.refresh(user)
    return {"message": "Profile updated", "full_name": user.full_name}


@router.post("/photo")
async def upload_photo(
    file: UploadFile = File(...),
    db: AsyncSession  = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    suffix = "." + (file.filename or "photo.jpg").rsplit(".", 1)[-1].lower()
    if suffix not in ALLOWED_IMAGE:
        raise HTTPException(status_code=400, detail="Only image files allowed (jpg/png/webp)")

    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 5 MB")

    blob_name = f"avatar_{_uuid.uuid4()}{suffix}"
    url = await _upload_blob(data, blob_name, file.content_type or "image/jpeg")

    user = await db.get(User, UUID(current_user.id))
    user.avatar_url = url
    await db.commit()
    return {"avatar_url": url}


@router.post("/password")
async def change_password(
    payload: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    user = await db.get(User, UUID(current_user.id))
    if not user or not user.password_hash:
        raise HTTPException(status_code=400, detail="Cannot change password")
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}
