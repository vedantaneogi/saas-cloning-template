import secrets
import sys

from pydantic_settings import BaseSettings, SettingsConfigDict


# §2 — SECRET_KEY must come from the environment. The previous default
# was a fixed string ("change-me-in-production-…") which silently shipped
# to staging on every deploy that forgot to override it; anyone reading
# the source could forge JWTs. Generate a fresh random fallback ONLY
# inside this process so dev still boots without an .env, but emit a
# loud warning so it's obvious in logs. Set SECRET_KEY in production.
def _resolve_secret_key() -> str:
    # Use a per-process random fallback; restart = new keys = all old
    # JWTs invalid. Acceptable for dev, never silently usable in prod.
    return secrets.token_urlsafe(64)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    APP_NAME: str = "Outlook Clone API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/outlook_clone"

    # Security
    # Default is a per-process random value — set SECRET_KEY=<long-random>
    # in your env for any deploy that needs JWTs to survive restart.
    SECRET_KEY: str = _resolve_secret_key()
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    # §2 — httpOnly session cookie. Set to True in prod (HTTPS-only origin)
    # so the browser refuses to send the cookie over plain HTTP.
    COOKIE_SECURE: bool = False

    # Email (Resend)
    RESEND_API_KEY: str = ""
    RESEND_FROM_DOMAIN: str = "resend.dev"  # verified domain for "from" address

    # CORS — explicit allowlist. Wildcard `*` is rejected by browsers
    # when combined with credentials, and is generally unsafe with the
    # cookie-based auth. Add additional origins to this list (or via
    # CORS_ORIGINS env var as JSON) when deploying to a new domain.
    CORS_ORIGINS: list[str] = [
        "https://outlook.clone.test",
        "http://outlook.clone.test",
        "http://localhost:3045",  # Vite dev server
        "http://localhost:8045",  # FastAPI dev port (when SPA served by uvicorn)
    ]

    # Pagination
    DEFAULT_PAGE_LIMIT: int = 50
    MAX_PAGE_LIMIT: int = 200

    # Chaos (optional)
    CHAOS_ENABLED: bool = False


settings = Settings()

# Warn loudly if SECRET_KEY wasn't set via env — the process-random
# fallback means JWTs don't survive container restarts.
import os as _os
if not _os.environ.get("SECRET_KEY"):
    print(
        "[config] WARNING: SECRET_KEY not set in environment — using a "
        "per-process random value. JWTs will not survive process restart. "
        "Set SECRET_KEY in your .env or container env for any deploy.",
        file=sys.stderr,
        flush=True,
    )
