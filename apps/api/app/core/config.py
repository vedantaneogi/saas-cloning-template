from functools import lru_cache
from typing import Any, List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/docusign"

    secret_key: str = "docusign-clone-dev-secret-key-change-in-production-2026"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080

    cors_origins: str = "http://localhost:3000"
    api_prefix: str = "/api"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    test_auth_enabled: bool = False
    test_auth_email: str = "test@example.com"
    test_auth_name: str = "Test User"

    admin_api_key: str | None = None

    upload_dir: str = "./uploads"

    frontend_url: str = "http://localhost:3000"
    cookie_domain: str = ""
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    resend_api_key: str | None = None
    email_from: str = "DocuSign Clone <onboarding@resend.dev>"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
