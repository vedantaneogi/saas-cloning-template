"""automation due_date_passed trigger

Adds the `due_date_passed` value to the automation_trigger enum so scheduled
rules can escalate issues whose due_date has passed.

Revision ID: j2e7f50a1b88
Revises: i9c4d52a1f76
Create Date: 2026-05-14 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op


revision: str = 'j2e7f50a1b88'
down_revision: str | Sequence[str] | None = 'i9c4d52a1f76'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # ALTER TYPE ... ADD VALUE must run outside a transaction.
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'due_date_passed'")
    # SQLite stores enums as plain strings; nothing to do.


def downgrade() -> None:
    # Postgres doesn't allow dropping enum values; downgrade is a no-op.
    pass
