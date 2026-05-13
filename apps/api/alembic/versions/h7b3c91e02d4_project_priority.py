"""project priority

Adds Project.priority integer column (0=No priority, 1=Urgent, 2=High,
3=Medium, 4=Low) — matching the Issue.priority scale Linear uses.

Revision ID: h7b3c91e02d4
Revises: g4e8f1a72e95
Create Date: 2026-05-13 12:50:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = 'h7b3c91e02d4'
down_revision: str | Sequence[str] | None = 'g4e8f1a72e95'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'projects',
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('projects', 'priority')
