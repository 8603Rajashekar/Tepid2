import json
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise Field Operations Platform"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "local"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str | None = None
    SYNC_DATABASE_URL: str | None = None
    DB_HOST: str | None = None
    DB_NAME: str | None = None
    DB_USER: str | None = None
    DB_PASSWORD: str | None = None
    DB_PORT: int = 1433
    DB_DRIVER: str = "ODBC Driver 18 for SQL Server"
    CORS_ORIGINS: list[str] = ["*"]
    CORS_ORIGIN_REGEX: str | None = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"

    AUTH_MOCK_ENABLED: bool = True
    AZURE_AD_B2C_TENANT_NAME: str | None = None
    AZURE_AD_B2C_CLIENT_ID: str | None = None
    AZURE_AD_B2C_POLICY_NAME: str | None = None
    AZURE_AD_B2C_ISSUER: str | None = None
    AZURE_AD_B2C_JWKS_URL: str | None = None

    AZURE_STORAGE_CONNECTION_STRING: str | None = None

    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15, ge=1)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1)
    JWT_SECRET_KEY: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            if value.strip().startswith("["):
                return json.loads(value)
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if self.DB_HOST and self.DB_NAME and self.DB_USER and self.DB_PASSWORD:
            from urllib.parse import quote_plus
            odbc = (
                f"Driver={{{self.DB_DRIVER}}};"
                f"Server=tcp:{self.DB_HOST},{self.DB_PORT};"
                f"Database={self.DB_NAME};"
                f"Uid={self.DB_USER};"
                f"Pwd={self.DB_PASSWORD};"
                f"Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
            )
            return f"mssql+aioodbc:///?odbc_connect={quote_plus(odbc)}"
        return "postgresql+asyncpg://postgres:postgres@localhost:5432/fieldops"

    @property
    def sync_database_url(self) -> str:
        if self.SYNC_DATABASE_URL:
            return self.SYNC_DATABASE_URL
        if self.DB_HOST and self.DB_NAME and self.DB_USER and self.DB_PASSWORD:
            from urllib.parse import quote_plus
            odbc = (
                f"Driver={{{self.DB_DRIVER}}};"
                f"Server=tcp:{self.DB_HOST},{self.DB_PORT};"
                f"Database={self.DB_NAME};"
                f"Uid={self.DB_USER};"
                f"Pwd={self.DB_PASSWORD};"
                f"Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
            )
            return f"mssql+pyodbc:///?odbc_connect={quote_plus(odbc)}"
        return "postgresql://postgres:postgres@localhost:5432/fieldops"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
