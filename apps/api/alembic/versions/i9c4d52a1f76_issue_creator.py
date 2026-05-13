"""issue creator

Adds Issue.creator_id so the activity log can reference the original
issue creator instead of the current assignee.

Revision ID: i9c4d52a1f76
Revises: h7b3c91e02d4
Create Date: 2026-05-13 18:30:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = 'i9c4d52a1f76'
down_revision: str | Sequence[str] | None = 'h7b3c91e02d4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'issues',
        sa.Column('creator_id', sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        op.f('fk_issues_creator_id_members'),
        'issues', 'members',
        ['creator_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(op.f('fk_issues_creator_id_members'), 'issues', type_='foreignkey')
    op.drop_column('issues', 'creator_id')
