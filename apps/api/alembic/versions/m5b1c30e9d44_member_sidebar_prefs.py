"""member sidebar_prefs JSON column

Adds the `sidebar_prefs` text column on `members` for per-member sidebar
customization (Customize sidebar dialog).

Revision ID: m5b1c30e9d44
Revises: l4a9e02f8c33
Create Date: 2026-05-16 02:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'm5b1c30e9d44'
down_revision: str | Sequence[str] | None = 'l4a9e02f8c33'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('members') as batch_op:
        batch_op.add_column(sa.Column('sidebar_prefs', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('members') as batch_op:
        batch_op.drop_column('sidebar_prefs')
