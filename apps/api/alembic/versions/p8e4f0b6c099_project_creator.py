"""project creator

Adds Project.creator_id so the projects-list "Creator" filter and the
project-detail activity row can reference the original creator
independent of the lead. Mirrors `issues.creator_id` added in
i9c4d52a1f76.

Revision ID: p8e4f0b6c099
Revises: o7d3e520b066
Create Date: 2026-05-18 09:30:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'p8e4f0b6c099'
down_revision: str | Sequence[str] | None = 'o7d3e520b066'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('projects') as batch_op:
        batch_op.add_column(sa.Column('creator_id', sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            'fk_projects_creator_id_members',
            'members',
            ['creator_id'], ['id'],
            ondelete='SET NULL',
        )


def downgrade() -> None:
    with op.batch_alter_table('projects') as batch_op:
        batch_op.drop_constraint('fk_projects_creator_id_members', type_='foreignkey')
        batch_op.drop_column('creator_id')
