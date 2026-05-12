"""FastAPI app entrypoint."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router
from app.auth.routes import router as auth_router
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.seed import apply_seed

settings = get_settings()

app = FastAPI(title="SAAS Clone Factory API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "service": "saas-clone-factory-api"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.on_event("startup")
def maybe_seed_from_file() -> None:
    """Apply seed JSON from SEED_PATH on boot if set (Universal Req.)."""
    if not settings.seed_path:
        return
    p = Path(settings.seed_path)
    if not p.exists():
        return
    with p.open("r", encoding="utf-8") as f:
        payload = json.load(f)
    db = SessionLocal()
    try:
        apply_seed(db, payload)
    finally:
        db.close()


app.include_router(auth_router)
app.include_router(router)
