"""team_preferences.left flag

Adds the `left` column to `team_preferences` so a self-service leave hides
the team from the user's workspace fetch / sidebar until they re-join.

Revision ID: l4a9e02f8c33
Revises: k3f8a91c5b22
Create Date: 2026-05-16 01:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'l4a9e02f8c33'
down_revision: str | Sequence[str] | None = 'k3f8a91c5b22'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('team_preferences') as batch_op:
        batch_op.add_column(sa.Column('left', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table('team_preferences') as batch_op:
        batch_op.drop_column('left')
