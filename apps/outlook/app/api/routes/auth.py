from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SESSION_COOKIE_NAME, get_current_user
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenOut
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["Auth"])


# Cookie max-age mirrors the JWT TTL so the browser drops the cookie when the
# token expires — no stale-token edge cases for the frontend to handle.
_COOKIE_MAX_AGE_SECONDS = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _set_session_cookie(response: Response, token: str) -> None:
    """Write the auth cookie. httpOnly so JS can't read the token (mitigates
    XSS-driven session theft per §2 — JWT-in-localStorage was the prior
    pattern and is now retired). SameSite=lax so same-origin POSTs still
    carry the cookie while cross-site GETs don't leak it.
    """
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        # `secure` only when serving over HTTPS — Caddy gateway terminates
        # TLS in prod, while local dev hits http://localhost. Toggle via
        # COOKIE_SECURE env var if you proxy through a different stack.
        secure=getattr(settings, "COOKIE_SECURE", False),
        path="/",
    )


@router.post("/login", response_model=TokenOut)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "invalid_credentials", "message": "Invalid email or password"}},
        )
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "invalid_credentials", "message": "Invalid email or password"}},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "account_inactive", "message": "Account is inactive"}},
        )

    token = create_access_token(str(user.id))
    _set_session_cookie(response, token)
    # Body still includes the token so the transitional Bearer flow keeps
    # working until apps/web is removed. New clients should ignore
    # access_token and rely on the cookie.
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/logout")
async def logout(response: Response):
    """Clear the session cookie. Returns 200 even when no session exists
    so the frontend can call this defensively on every sign-out click."""
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return {"status": "ok"}


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
