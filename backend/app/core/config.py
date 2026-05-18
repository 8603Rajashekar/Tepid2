from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise Field Operations Platform"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "local"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/fieldops"
    SYNC_DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/fieldops"
    CORS_ORIGINS: list[str] = ["*"]

    AUTH_MOCK_ENABLED: bool = True
    AZURE_AD_B2C_TENANT_NAME: str | None = None
    AZURE_AD_B2C_CLIENT_ID: str | None = None
    AZURE_AD_B2C_POLICY_NAME: str | None = None
    AZURE_AD_B2C_ISSUER: str | None = None
    AZURE_AD_B2C_JWKS_URL: str | None = None

    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15, ge=1)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1)
    JWT_SECRET_KEY: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
