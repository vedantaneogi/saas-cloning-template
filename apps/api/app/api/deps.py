"""FastAPI dependency helpers."""

from __future__ import annotations

from collections.abc import Generator

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Workspace
from app.db.session import get_db as _get_db


def get_db() -> Generator[Session, None, None]:
    yield from _get_db()


def get_workspace(slug: str, db: Session = Depends(get_db)) -> Workspace:
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail=f"workspace not found: {slug}")
    return ws
