"""invite team_keys JSON

Adds a `team_keys_json` text column to `workspace_invites` so the invite
modal's "Add to team" picker is persisted — the new member auto-joins
those teams on accept.

Revision ID: o7d3e520b066
Revises: n6c2d41fae55
Create Date: 2026-05-16 13:10:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'o7d3e520b066'
down_revision: str | Sequence[str] | None = 'n6c2d41fae55'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('workspace_invites') as batch_op:
        batch_op.add_column(sa.Column('team_keys_json', sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('workspace_invites') as batch_op:
        batch_op.drop_column('team_keys_json')
