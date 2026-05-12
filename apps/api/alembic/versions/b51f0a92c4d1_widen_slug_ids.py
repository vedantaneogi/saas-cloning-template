"""widen slug_ids on projects and initiatives

Project.slug_id was String(16) and Initiative.slug_id was String(32). Slugs are
built as ``{name}-{12-hex}`` so even short names exceed 16, and only the
shortest initiative names fit in 32. SQLite silently ignored the length cap,
so this never surfaced in dev; Postgres rejects with StringDataRightTruncation.

Revision ID: b51f0a92c4d1
Revises: 423fc910e46c
Create Date: 2026-05-12 18:30:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = 'b51f0a92c4d1'
down_revision: str | Sequence[str] | None = '423fc910e46c'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('projects') as b:
        b.alter_column('slug_id', existing_type=sa.String(length=16), type_=sa.String(length=128), existing_nullable=False)
    with op.batch_alter_table('initiatives') as b:
        b.alter_column('slug_id', existing_type=sa.String(length=32), type_=sa.String(length=128), existing_nullable=False)


def downgrade() -> None:
    with op.batch_alter_table('initiatives') as b:
        b.alter_column('slug_id', existing_type=sa.String(length=128), type_=sa.String(length=32), existing_nullable=False)
    with op.batch_alter_table('projects') as b:
        b.alter_column('slug_id', existing_type=sa.String(length=128), type_=sa.String(length=16), existing_nullable=False)
