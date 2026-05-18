from collections.abc import AsyncGenerator, Callable

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import TokenUser, decode_access_token
from app.db.session import AsyncSessionLocal as async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


async def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
) -> TokenUser:
    if settings.AUTH_MOCK_ENABLED:
        return TokenUser(
            id="00000000-0000-0000-0000-000000000001",
            email="admin@example.com",
            full_name="Local Admin",
            roles=["super_admin", "admin"],
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    token = authorization.removeprefix("Bearer ").strip()
    user = await decode_access_token(token)
    request.state.current_user = user
    return user


def require_roles(allowed_roles: list[str]) -> Callable[[TokenUser], TokenUser]:
    def dependency(current_user: TokenUser = Depends(get_current_user)) -> TokenUser:
        if not set(current_user.roles).intersection(allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return current_user

    return dependency
