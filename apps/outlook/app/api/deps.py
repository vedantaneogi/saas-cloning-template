from typing import Optional

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

# Cookie-first auth per §2 of the universal acceptance criteria
# ("Sessions go in cookies, period."). The Bearer scheme remains as a
# fallback so external test harnesses + the legacy frontend bootstrap
# (still on apps/web during the migration) keep working until the
# Phase-3 Vite app fully takes over. New code paths use the cookie.
SESSION_COOKIE_NAME = "outlook_session"

bearer_scheme = HTTPBearer(auto_error=False)


def _401(message: str, code: str = "invalid_token") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error": {"code": code, "message": message}},
    )


async def get_current_user(
    session_token: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Prefer the httpOnly session cookie. Fall back to Bearer for the
    # transitional window — drops once apps/web is removed in Phase 6.
    token: Optional[str] = None
    if session_token:
        token = session_token
    elif credentials:
        token = credentials.credentials

    if not token:
        raise _401("Authentication required", code="missing_token")

    payload = decode_access_token(token)
    if not payload:
        raise _401("Token is invalid or expired")

    user_id = payload.get("sub")
    if not user_id:
        raise _401("Token missing subject")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise _401("User not found or inactive", code="user_not_found")
    return user
