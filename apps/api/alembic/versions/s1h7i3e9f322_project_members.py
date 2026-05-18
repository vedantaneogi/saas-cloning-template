"""project members association

Adds a `project_members` table so projects can have an explicit set
of members independent of the project's teams. Unblocks the Members
chip in the new-project modal and project detail panel — previously
ProjectDetail.members was derived from project.lead only.

Revision ID: s1h7i3e9f322
Revises: r0g6h2d8e211
Create Date: 2026-05-19 09:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 's1h7i3e9f322'
down_revision: str | Sequence[str] | None = 'r0g6h2d8e211'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'project_members',
        sa.Column('project_id', sa.String(length=36), sa.ForeignKey('projects.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('member_id', sa.String(length=36), sa.ForeignKey('members.id', ondelete='CASCADE'), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table('project_members')
