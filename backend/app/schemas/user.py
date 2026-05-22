from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.employee
    phone: str | None = None
    department: str = ""


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: str | None
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
