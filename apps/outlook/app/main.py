"""
Microsoft Outlook Clone — FastAPI Application
RL training environment backend.
"""
import asyncio
import json
import logging
import os
import signal
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ── Structured JSON logging ───────────────────────────────────────────────────
# We define episode_id_var here (before the middleware class) so the log filter
# can reference it.  The middleware sets it per-request.
from contextvars import ContextVar  # noqa: E402 (moved up for log filter)

episode_id_var: ContextVar[str | None] = ContextVar("episode_id", default=None)


class _EpisodeIDFilter(logging.Filter):
    """Injects the current request's X-Episode-ID into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.episode_id = episode_id_var.get()  # type: ignore[attr-defined]
        return True


try:
    from pythonjsonlogger import jsonlogger  # type: ignore

    handler = logging.StreamHandler()
    handler.setFormatter(
        jsonlogger.JsonFormatter(
            fmt="%(asctime)s %(levelname)s %(name)s %(episode_id)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
    )
    handler.addFilter(_EpisodeIDFilter())
    logging.root.handlers = [handler]
except ImportError:
    # pythonjsonlogger not installed — fall back to plain text with filter
    logging.basicConfig(level=logging.INFO)
    logging.root.addFilter(_EpisodeIDFilter())

logging.root.setLevel(logging.INFO)
logger = logging.getLogger(__name__)

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base  # noqa: F401 — ensures all models are registered
from app.db.session import engine, AsyncSessionLocal
from app.rl.endpoints import router as rl_router


async def _load_seed_from_path(seed_path: str) -> None:
    """Load seed from file path at boot if SEED_PATH env var is set."""
    from app.rl.seed_loader import load_seed
    from app.rl.state import rl_state
    from app.schemas.seed import SeedPayload

    try:
        with open(seed_path) as f:
            raw = json.load(f)
    except Exception as exc:
        rl_state.set_seed_error({"code": "seed_file_error", "message": str(exc)})
        return

    if "$schema" in raw and "schema_version" not in raw:
        raw["schema_version"] = raw.pop("$schema")

    try:
        payload = SeedPayload.model_validate(raw)
    except Exception as exc:
        rl_state.set_seed_error({"code": "validation_error", "message": str(exc)})
        return

    async with AsyncSessionLocal() as session:
        async with session.begin():
            entity_counts = await load_seed(session, payload)

    seed_version = payload.schema_version or "rl-env/v1"
    rl_state.set_ready(seed_version)
    rl_state.set_entity_counts(entity_counts)
    rl_state.store_seed_snapshot(raw, entity_counts)
    rl_state.event_log.append("seed_loaded", {"source": "SEED_PATH", "entity_counts": entity_counts})


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup; optionally load seed from SEED_PATH env var."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    seed_path = os.environ.get("SEED_PATH")
    if seed_path:
        await _load_seed_from_path(seed_path)

    # Seed default rooms if the rooms table is empty. Tenant-wide so
    # one-time on first boot is enough.
    from app.db.session import AsyncSessionLocal
    from app.models.room import Room
    from sqlalchemy import select, func
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(func.count()).select_from(Room))
        if (existing.scalar() or 0) == 0:
            defaults = [
                Room(name="Conf Room Adams", location="Building 1, Floor 2", capacity=8, status="available"),
                Room(name="Focus Room 1", location="Building 1, Floor 2", capacity=4, status="available"),
                Room(name="Focus Room 2", location="Building 1, Floor 3", capacity=6, status="available"),
                Room(name="Conf Room Baker", location="Building 1, Floor 2", capacity=10, status="busy"),
                Room(name="Conf Room Crystal", location="Building 1, Floor 1", capacity=12, status="busy"),
            ]
            session.add_all(defaults)
            await session.commit()

    # Configure Resend email delivery
    from app.core.email import configure_resend
    if settings.RESEND_API_KEY:
        configure_resend(settings.RESEND_API_KEY)
    else:
        logger.info("RESEND_API_KEY not set — real email delivery disabled")

    # Graceful SIGTERM: stop accepting new connections then drain
    loop = asyncio.get_event_loop()

    def _handle_sigterm(*_):
        loop.call_soon_threadsafe(loop.stop)

    try:
        signal.signal(signal.SIGTERM, _handle_sigterm)
    except (OSError, ValueError):
        pass  # Not in main thread or unsupported platform

    yield
    await engine.dispose()


app = FastAPI(
    title="Outlook Clone API",
    description="FastAPI backend for Microsoft Outlook clone — RL training environment",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# X-Episode-ID propagation + X-Response-Time middleware
# ---------------------------------------------------------------------------
import time  # noqa: E402
from starlette.middleware.base import BaseHTTPMiddleware  # noqa: E402


class EpisodeIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        episode_id = request.headers.get("X-Episode-ID")
        token = episode_id_var.set(episode_id)
        response = await call_next(request)
        if episode_id:
            response.headers["X-Episode-ID"] = episode_id
        episode_id_var.reset(token)
        return response


app.add_middleware(EpisodeIDMiddleware)


class ResponseTimeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Response-Time"] = f"{elapsed_ms:.2f}ms"
        return response


app.add_middleware(ResponseTimeMiddleware)

# ---------------------------------------------------------------------------
# Chaos middleware — latency + error injection on /api/v1/* routes only
# ---------------------------------------------------------------------------


class ChaosMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        from app.rl.state import rl_state  # local import to avoid circular

        # Only apply chaos to application API routes, not RL control plane
        is_api = request.url.path.startswith("/api/v1/")

        if is_api:
            rl_state.inc_request_count()

            # Chaos injection only when CHAOS_ENABLED=true
            if settings.CHAOS_ENABLED:
                # Error injection
                if rl_state.should_inject_error():
                    return JSONResponse(
                        status_code=rl_state.chaos_error_status,
                        content={"error": {"code": "chaos_injected", "message": "Chaos error injection"}},
                    )

                # Latency injection
                if rl_state.chaos_latency_enabled and rl_state.chaos_latency_ms > 0:
                    await asyncio.sleep(rl_state.chaos_latency_ms / 1000)

        return await call_next(request)


app.add_middleware(ChaosMiddleware)

# ---------------------------------------------------------------------------
# Global exception handler — ensures all errors use { error: { code, message } }
# ---------------------------------------------------------------------------


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # §2 — never echo the raw exception message to the client. Stack
    # frames, file paths, SQL fragments, and secrets routinely leak
    # through `str(exc)`. Log the full detail server-side; return a
    # generic envelope to the caller.
    import logging
    logging.getLogger("app").exception(
        "Unhandled exception on %s %s", request.method, request.url.path
    )
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": "Internal server error"}},
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

# RL environment endpoints (no /api/v1 prefix)
app.include_router(rl_router)

# Application endpoints
app.include_router(api_router)


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------


@app.get("/", include_in_schema=False)
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
