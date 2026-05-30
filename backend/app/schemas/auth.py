from uuid import UUID
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserInfo(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    roles: list[str]


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserInfo


class RefreshRequest(BaseModel):
    refresh_token: str


class MobileOtpRequest(BaseModel):
    mobile: str


class MobileOtpVerifyRequest(BaseModel):
    mobile: str
    otp: str


class OtpRequestResponse(BaseModel):
    message: str
    expires_in_seconds: int
