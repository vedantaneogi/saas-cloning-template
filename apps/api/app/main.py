import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    os.makedirs(settings.upload_dir, exist_ok=True)
    yield


app = FastAPI(
    title="DocuSign Clone API",
    version="0.1.0",
    description="Electronic signature platform API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Cookie"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/health")
async def root_health() -> dict:
    """Root health check for Docker/container health probes."""
    return {"status": "ok"}
