"""FastAPI dependency helpers — db session, auth, workspace + member resolution."""

from __future__ import annotations

from collections.abc import Generator

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.security import decode_token
from app.core.config import get_settings
from app.db.models import Member, MemberRole, User, Workspace
from app.db.session import get_db as _get_db


def get_db() -> Generator[Session, None, None]:
    yield from _get_db()


def _cookie_name() -> str:
    return get_settings().auth_cookie_name


def get_current_user(
    db: Session = Depends(get_db),
    lc_session: str | None = Cookie(default=None, alias=get_settings().auth_cookie_name),
) -> User:
    user_id = decode_token(lc_session or "")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not authenticated")
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user no longer exists")
    return user


def get_optional_user(
    db: Session = Depends(get_db),
    lc_session: str | None = Cookie(default=None, alias=get_settings().auth_cookie_name),
) -> User | None:
    user_id = decode_token(lc_session or "")
    if not user_id:
        return None
    return db.query(User).filter_by(id=user_id).first()


def get_workspace(slug: str, db: Session = Depends(get_db)) -> Workspace:
    ws = db.query(Workspace).filter_by(slug=slug).first()
    if not ws:
        raise HTTPException(status_code=404, detail=f"workspace not found: {slug}")
    return ws


def get_current_member(
    user: User = Depends(get_current_user),
    ws: Workspace = Depends(get_workspace),
    db: Session = Depends(get_db),
) -> Member:
    """The current user's Member row for the requested workspace.
    403s if the user isn't part of this workspace."""
    member = db.query(Member).filter_by(workspace_id=ws.id, user_id=user.id).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="you are not a member of this workspace",
        )
    return member


def require_role(*roles: MemberRole):
    """Dependency factory: require the current member to have one of `roles`."""

    def _dep(member: Member = Depends(get_current_member)) -> Member:
        if member.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"role {member.role.value} cannot perform this action",
            )
        return member

    return _dep
