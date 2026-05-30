from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest,
    MobileOtpRequest,
    MobileOtpVerifyRequest,
    OtpRequestResponse,
    RefreshRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    return await AuthService.login(db, payload)


@router.post("/login/mobile/request-otp", response_model=OtpRequestResponse)
async def request_mobile_otp(
    payload: MobileOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    return await AuthService.request_mobile_otp(db, payload)


@router.post("/login/mobile/verify-otp", response_model=TokenResponse)
async def verify_mobile_otp(
    payload: MobileOtpVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    return await AuthService.verify_mobile_otp(db, payload)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    payload: RefreshRequest,
):
    return await AuthService.refresh(payload)


@router.get("/me", response_model=TokenUser)
async def me(
    current_user: TokenUser = Depends(get_current_user),
):
    return current_user
