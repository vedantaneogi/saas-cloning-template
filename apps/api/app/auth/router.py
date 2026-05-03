from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.auth.schemas import UserCreate, UserLogin, UserResponse
from app.auth.service import authenticate_user, create_user, get_user_by_email
from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.session import get_db

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
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


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed",
        )
    user = await create_user(db, data)
    token = create_access_token(subject=user.id)
    _set_auth_cookie(response, token)
    return user


@router.post("/login", response_model=UserResponse)
async def login(
    data: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await authenticate_user(db, data.email, data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(subject=user.id)
    _set_auth_cookie(response, token)
    return user


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,  # type: ignore[arg-type]
        domain=settings.cookie_domain,
        path="/",
    )
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.get("/config")
def auth_config() -> dict:
    return {"test_auth_enabled": settings.test_auth_enabled}


@router.post("/test-login", response_model=UserResponse)
async def test_login(
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    if not settings.test_auth_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    email = settings.test_auth_email
    user = await get_user_by_email(db, email)
    if user is None:
        user = await create_user(
            db,
            UserCreate(
                email=email,
                password="test-password-not-used",
                name=settings.test_auth_name,
            ),
        )

    token = create_access_token(subject=user.id)
    _set_auth_cookie(response, token)
    return user
