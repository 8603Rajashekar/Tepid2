from datetime import datetime, timedelta, timezone
import hashlib
import random
import re

from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
)
from app.modules.auth.model import LoginOtp
from app.modules.notifications.service import NotificationService
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    LoginRequest,
    MobileOtpRequest,
    MobileOtpVerifyRequest,
    OtpRequestResponse,
    RefreshRequest,
    TokenResponse,
    UserInfo,
)


class AuthService:
    @staticmethod
    def _normalize_mobile(mobile: str) -> str:
        return re.sub(r"[^\d+]", "", (mobile or "").strip())

    @staticmethod
    def _otp_hash(mobile: str, otp: str) -> str:
        raw = f"{mobile}:{otp}:{settings.JWT_SECRET_KEY}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def _build_token_response(user) -> TokenResponse:
        role = user.role.value if user.role else "employee"
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": role,
            "roles": [role],
        }

        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserInfo(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=role,
                roles=[role],
            ),
        )

    @staticmethod
    async def login(db: AsyncSession, payload: LoginRequest) -> TokenResponse:
        user = await UserRepository.get_by_email(db, payload.email)

        if not user or not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled",
            )

        return AuthService._build_token_response(user)

    @staticmethod
    async def request_mobile_otp(db: AsyncSession, payload: MobileOtpRequest) -> OtpRequestResponse:
        mobile = AuthService._normalize_mobile(payload.mobile)
        if not mobile:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mobile number is required")

        user = await UserRepository.get_by_phone(db, mobile)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found for this mobile number")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

        now = datetime.now(timezone.utc)
        latest = (
            await db.execute(
                select(LoginOtp)
                .where(LoginOtp.mobile == mobile)
                .order_by(LoginOtp.created_at.desc())
                .limit(1)
            )
        ).scalars().first()

        if latest:
            created_at = latest.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if (now - created_at).total_seconds() < settings.OTP_RESEND_COOLDOWN_SECONDS:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {settings.OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new OTP",
                )

        await db.execute(delete(LoginOtp).where(LoginOtp.mobile == mobile, LoginOtp.is_used == False))  # noqa: E712

        otp = "".join(str(random.randint(0, 9)) for _ in range(settings.OTP_LENGTH))
        expires_at = now + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        db.add(
            LoginOtp(
                mobile=mobile,
                otp_hash=AuthService._otp_hash(mobile, otp),
                attempts=0,
                is_used=False,
                expires_at=expires_at,
            )
        )
        await db.commit()

        template = settings.SMS_OTP_TEMPLATE_TEXT or "Your OTP is {otp}"
        message = template.replace("{#var#}", otp).replace("{otp}", otp)
        sms_ok, sms_detail = await NotificationService.send_sms(phone=mobile, message=message)
        if not sms_ok:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OTP generated but SMS delivery failed: {sms_detail}",
            )

        return OtpRequestResponse(
            message="OTP sent successfully",
            expires_in_seconds=settings.OTP_EXPIRY_MINUTES * 60,
        )

    @staticmethod
    async def verify_mobile_otp(db: AsyncSession, payload: MobileOtpVerifyRequest) -> TokenResponse:
        mobile = AuthService._normalize_mobile(payload.mobile)
        otp = (payload.otp or "").strip()
        if not mobile or not otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mobile number and OTP are required")

        user = await UserRepository.get_by_phone(db, mobile)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found for this mobile number")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

        row = (
            await db.execute(
                select(LoginOtp)
                .where(LoginOtp.mobile == mobile, LoginOtp.is_used == False)  # noqa: E712
                .order_by(LoginOtp.created_at.desc())
                .limit(1)
            )
        ).scalars().first()

        if not row:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP not requested")

        now = datetime.now(timezone.utc)
        expires_at = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired")
        if row.attempts >= settings.OTP_MAX_ATTEMPTS:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="OTP attempts exceeded")

        if row.otp_hash != AuthService._otp_hash(mobile, otp):
            row.attempts += 1
            await db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP")

        row.is_used = True
        await db.commit()
        return AuthService._build_token_response(user)

    @staticmethod
    async def refresh(payload: RefreshRequest) -> TokenResponse:
        try:
            data = jwt.decode(
                payload.refresh_token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        if data.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        role = data.get("role", (data.get("roles") or ["employee"])[0])
        token_data = {
            "sub": data["sub"],
            "email": data["email"],
            "full_name": data["full_name"],
            "role": role,
            "roles": [role],
        }

        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserInfo(
                id=data["sub"],
                email=data["email"],
                full_name=data["full_name"],
                role=role,
                roles=[role],
            ),
        )
