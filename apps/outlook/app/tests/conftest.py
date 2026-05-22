"""Shared pytest setup — runs before any test module is imported.

The engine inside `app.db.session` is instantiated at import time. If the
shell has a leftover `DATABASE_URL` env var pointing at a plain
`postgresql://...` driver (rather than `postgresql+asyncpg://...`),
SQLAlchemy demands psycopg2 — which is not in the venv. Force the URL
here so unit tests stay self-contained regardless of shell state.
"""

import os

# Set BEFORE any `import app.*` happens. pytest imports conftest.py first,
# so this runs ahead of every test module's top-level imports.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5445/outlook_test",
)
# Force the prefix even if a stale value is already in the environment.
if not os.environ["DATABASE_URL"].startswith("postgresql+asyncpg://"):
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5445/outlook_test"
