"""Password hashing + JWT session helpers."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import get_settings


def hash_password(plain: str) -> str:
    # bcrypt has a 72-byte input limit; truncate defensively.
    pw = plain.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pw = plain.encode("utf-8")[:72]
        return bcrypt.checkpw(pw, hashed.encode("utf-8"))
    except Exception:
        return False


def issue_token(user_id: str) -> tuple[str, datetime]:
    s = get_settings()
    exp = datetime.now(timezone.utc) + timedelta(days=s.auth_session_days)
    payload = {
        "sub": user_id,
        "exp": exp.timestamp(),
        "iat": datetime.now(timezone.utc).timestamp(),
    }
    token = jwt.encode(payload, s.auth_secret, algorithm="HS256")
    return token, exp


def decode_token(token: str) -> str | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, get_settings().auth_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    return payload.get("sub")


def random_token(n_bytes: int = 24) -> str:
    return secrets.token_urlsafe(n_bytes)
