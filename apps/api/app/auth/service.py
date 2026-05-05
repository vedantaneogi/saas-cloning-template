import uuid as _uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.schemas import UserCreate
from app.core.security import hash_password, verify_password


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    user = User(
        email=data.email,
        name=data.name,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(db, email)
    if not user:
        # Run hash check anyway to equalize timing and prevent user enumeration
        verify_password("dummy", "$2b$12$LJ3m4qs6Kp0Sy0BRBQZN5OZz0AzHSKXDPmE6x7pCqMq5AIKVkm6S")
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def create_password_reset_token(db: AsyncSession, user: User) -> str:
    token = str(_uuid.uuid4())
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.commit()
    return token


async def reset_password_with_token(db: AsyncSession, token: str, new_password: str) -> User | None:
    result = await db.execute(select(User).where(User.reset_token == token))
    user = result.scalar_one_or_none()
    if not user or not user.reset_token_expires:
        return None
    if user.reset_token_expires < datetime.now(timezone.utc):
        return None
    if verify_password(new_password, user.hashed_password):
        from fastapi import HTTPException, status as http_status
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password.",
        )
    user.hashed_password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    await db.commit()
    return user
