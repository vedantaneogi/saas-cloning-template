"""
Microsoft Outlook Clone — FastAPI Application
RL training environment backend.
"""
import json
import os
import signal
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
# Global exception handler — ensures all errors use { error: { code, message } }
# ---------------------------------------------------------------------------


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": str(exc)}},
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
