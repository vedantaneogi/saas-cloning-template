"""Initialize database schema using SQLAlchemy create_all (dev mode)."""
import asyncio
import os
import sys

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine

from app.db.base import Base
from app.auth.models import User  # noqa: F401
from app.envelopes.models import Envelope, Document, Recipient, Field, AuditEvent  # noqa: F401
from app.templates.models import Template  # noqa: F401
from app.contacts.models import Contact  # noqa: F401


async def init_db():
    database_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/docusign"
    )
    engine = create_async_engine(database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("Database tables created successfully.")


if __name__ == "__main__":
    asyncio.run(init_db())
