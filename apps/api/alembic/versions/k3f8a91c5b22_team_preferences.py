"""team preferences (favorite + subscription topics)

Adds the `team_preferences` table that stores per-member favorite-pin and
the three Linear-style subscription topics (issue_added, issue_resolved,
triage_added) for a team.

Revision ID: k3f8a91c5b22
Revises: j2e7f50a1b88
Create Date: 2026-05-16 00:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'k3f8a91c5b22'
down_revision: str | Sequence[str] | None = 'j2e7f50a1b88'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'team_preferences',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('member_id', sa.String(length=36), nullable=False),
        sa.Column('team_id', sa.String(length=36), nullable=False),
        sa.Column('favorite', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('sub_issue_added', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('sub_issue_resolved', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('sub_triage_added', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('member_id', 'team_id', name='uq_team_prefs_member_team'),
    )
    op.create_index('ix_team_preferences_member_id', 'team_preferences', ['member_id'])
    op.create_index('ix_team_preferences_team_id', 'team_preferences', ['team_id'])


def downgrade() -> None:
    op.drop_index('ix_team_preferences_team_id', table_name='team_preferences')
    op.drop_index('ix_team_preferences_member_id', table_name='team_preferences')
    op.drop_table('team_preferences')
