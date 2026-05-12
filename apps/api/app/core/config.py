"""Runtime configuration for the API.

Pulls from environment variables; falls back to local dev defaults so the
app starts cleanly out of the box (Postgres on localhost:5432).
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(
        # Dev default = SQLite so the API runs without external infra.
        # Set DATABASE_URL=postgresql+psycopg://... in .env for Postgres.
        default="sqlite:///./clone.db",
        alias="DATABASE_URL",
    )
    cors_origins: list[str] = Field(
        default=["http://localhost:3000"],
        alias="CORS_ORIGINS",
    )
    seed_path: str | None = Field(default=None, alias="SEED_PATH")
    api_log_sql: bool = Field(default=False, alias="API_LOG_SQL")

    # Auth — JWT secret + cookie name. Override in production.
    auth_secret: str = Field(default="dev-insecure-change-me", alias="AUTH_SECRET")
    auth_cookie_name: str = Field(default="lc_session", alias="AUTH_COOKIE_NAME")
    auth_session_days: int = Field(default=30, alias="AUTH_SESSION_DAYS")
    auth_cookie_secure: bool = Field(default=False, alias="AUTH_COOKIE_SECURE")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
