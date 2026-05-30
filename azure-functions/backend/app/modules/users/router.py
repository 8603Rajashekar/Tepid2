from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.core.security import TokenUser
from app.db.session import get_db
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get("/", response_model=list[UserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    return await UserService.get_users(db)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    return await UserService.get_user(db, user_id)


@router.post("/", response_model=UserResponse)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(require_roles(["admin", "super_admin", "supervisor"])),
):
    return await UserService.create_user(db, payload, current_user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(require_roles(["admin", "super_admin", "manager"])),
):
    return await UserService.update_user(db, user_id, payload)


@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(require_roles(["admin", "super_admin"])),
):
    return await UserService.delete_user(db, user_id)
