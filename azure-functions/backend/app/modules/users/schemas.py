from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str = Field(min_length=5, max_length=200)
    phone: str | None = Field(default=None, max_length=20)
    department: str = Field(min_length=2, max_length=100)
    designation: str | None = Field(default=None, max_length=100)
    roles: list[str] = Field(default_factory=list)


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str | None
    department: str
    designation: str | None
    roles: list[str]
    is_active: bool


class UserListResponse(BaseModel):
    items: list[UserResponse]
    page: int
    limit: int
    total: int
