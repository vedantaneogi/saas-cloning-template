import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.schemas import GoogleUserInfo
from app.core.config import get_settings

settings = get_settings()

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


async def exchange_code_for_userinfo(code: str) -> GoogleUserInfo:
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        userinfo_resp.raise_for_status()

    return GoogleUserInfo(**userinfo_resp.json())


async def upsert_user(db: AsyncSession, info: GoogleUserInfo) -> User:
    result = await db.execute(select(User).where(User.google_id == info.sub))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            google_id=info.sub,
            email=info.email,
            name=info.name,
            picture=info.picture,
        )
        db.add(user)
    else:
        user.email = info.email
        user.name = info.name
        user.picture = info.picture

    await db.commit()
    await db.refresh(user)
    return user
