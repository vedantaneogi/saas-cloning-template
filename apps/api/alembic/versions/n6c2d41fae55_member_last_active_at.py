"""member last_active_at column

Adds a `last_active_at` timestamp on `members` so the Members page can
render "Online"/relative last-seen labels. The column is touched by the
`get_current_member` dependency on every authenticated request.

Revision ID: n6c2d41fae55
Revises: m5b1c30e9d44
Create Date: 2026-05-16 12:55:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'n6c2d41fae55'
down_revision: str | Sequence[str] | None = 'm5b1c30e9d44'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('members') as batch_op:
        batch_op.add_column(sa.Column('last_active_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index('ix_members_last_active_at', ['last_active_at'])


def downgrade() -> None:
    with op.batch_alter_table('members') as batch_op:
        batch_op.drop_index('ix_members_last_active_at')
        batch_op.drop_column('last_active_at')
