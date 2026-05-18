"""project labels, template_id, dependencies

Adds:
- project_labels association (project_id, label_id) — so the Labels
  filter on /projects can actually filter on labels attached to
  projects (separate from per-issue labels).
- projects.template_id FK to templates — so the Template filter has
  a real column to filter on.
- project_dependencies self-join — so the Relations filter can show
  projects that block / are blocked by others.

Revision ID: r0g6h2d8e211
Revises: q9f5g1c7d100
Create Date: 2026-05-18 12:30:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'r0g6h2d8e211'
down_revision: str | Sequence[str] | None = 'q9f5g1c7d100'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'project_labels',
        sa.Column('project_id', sa.String(length=36), sa.ForeignKey('projects.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('label_id', sa.String(length=36), sa.ForeignKey('labels.id', ondelete='CASCADE'), primary_key=True),
    )
    op.create_table(
        'project_dependencies',
        sa.Column('project_id', sa.String(length=36), sa.ForeignKey('projects.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('dependency_id', sa.String(length=36), sa.ForeignKey('projects.id', ondelete='CASCADE'), primary_key=True),
    )
    with op.batch_alter_table('projects') as batch_op:
        batch_op.add_column(sa.Column('template_id', sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            'fk_projects_template_id_templates',
            'templates',
            ['template_id'], ['id'],
            ondelete='SET NULL',
        )


def downgrade() -> None:
    with op.batch_alter_table('projects') as batch_op:
        batch_op.drop_constraint('fk_projects_template_id_templates', type_='foreignkey')
        batch_op.drop_column('template_id')
    op.drop_table('project_dependencies')
    op.drop_table('project_labels')
