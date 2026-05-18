from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
)
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse, UserInfo


class AuthService:

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

        roles = await RoleRepository.get_roles_for_user(db, user.id)

        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "roles": roles,
        }

        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserInfo(id=user.id, email=user.email, full_name=user.full_name, roles=roles),
        )

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

        token_data = {
            "sub": data["sub"],
            "email": data["email"],
            "full_name": data["full_name"],
            "roles": data.get("roles", []),
        }

        roles = data.get("roles", [])
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            user=UserInfo(
                id=data["sub"],
                email=data["email"],
                full_name=data["full_name"],
                roles=roles,
            ),
        )
