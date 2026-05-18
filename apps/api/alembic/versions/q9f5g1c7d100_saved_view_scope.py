"""saved view scope + description

Adds `scope` (issues | projects) and `description` to SavedView so the
new projects toolbar can persist its filter funnel into the existing
saved-views table without polluting the issue-views sidebar.

Revision ID: q9f5g1c7d100
Revises: p8e4f0b6c099
Create Date: 2026-05-18 11:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'q9f5g1c7d100'
down_revision: str | Sequence[str] | None = 'p8e4f0b6c099'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('saved_views') as batch_op:
        batch_op.add_column(sa.Column('scope', sa.String(length=16), nullable=False, server_default='issues'))
        batch_op.add_column(sa.Column('description', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('saved_views') as batch_op:
        batch_op.drop_column('description')
        batch_op.drop_column('scope')
