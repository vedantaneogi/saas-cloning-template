from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.auth.schemas import GoogleUserInfo, UserOut
from app.auth.service import exchange_code_for_userinfo, upsert_user
from app.core.config import get_settings
from app.core.security import create_access_token

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"


@router.get("/login")
def google_login() -> RedirectResponse:
    params = urlencode(
        {
            "client_id": settings.google_client_id,
            "redirect_uri": settings.google_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "select_account",
        }
    )
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{params}")


@router.get("/callback")
async def google_callback(
    code: str,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    try:
        google_info = await exchange_code_for_userinfo(code)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange Google authorization code",
        )

    user = await upsert_user(db, google_info)
    token = create_access_token(subject=user.id)

    response = RedirectResponse(
        url=f"{settings.frontend_url}/",
        status_code=status.HTTP_302_FOUND,
    )
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,  # type: ignore[arg-type]
        domain=settings.cookie_domain,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    return response


@router.get("/config")
def auth_config() -> dict:
    """Public auth surface — lets the frontend conditionally render the
    test-login button when running against a local docker stack."""
    return {"test_auth_enabled": settings.test_auth_enabled}


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(
        key="access_token",
        path="/",
        domain=settings.cookie_domain,
    )
    return {"message": "Logged out"}


@router.post("/test-login", response_model=UserOut)
async def test_login(
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    if not settings.test_auth_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    info = GoogleUserInfo(
        sub=f"test-auth|{settings.test_auth_email}",
        email=settings.test_auth_email,
        name=settings.test_auth_name,
        picture=None,
        email_verified=True,
    )
    user = await upsert_user(db, info)
    token = create_access_token(subject=user.id)

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,  # type: ignore[arg-type]
        domain=settings.cookie_domain,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    return user
