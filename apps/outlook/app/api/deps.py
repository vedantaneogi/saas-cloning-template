from typing import Optional

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

# §2 — cookie-first auth. Bearer remains as a transitional fallback.
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
    # Prefer the Authorization Bearer header when present. The
    # frontend's multi-account switcher (TopToolbar avatar menu) stashes
    # one token per logged-in user in localStorage and attaches whichever
    # is currently selected on every request. If we read the cookie
    # first, the cookie's static "last login" wins and switching accounts
    # in the UI silently uses the wrong user server-side. Bearer-first
    # lets the explicit per-request override drive auth; the httpOnly
    # cookie still backstops single-account browser sessions that never
    # touch the multi-account UI.
    token: Optional[str] = None
    if credentials:
        token = credentials.credentials
    elif session_token:
        token = session_token

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
