"""initiative_updates table

Adds a per-initiative update stream mirroring the existing
project_updates table — body + health + author — so the initiative
detail page can host a "Write update" modal and surface activity.

Revision ID: v4k0l6h2i655
Revises: u3j9k5g1h544
Create Date: 2026-05-19 13:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'v4k0l6h2i655'
down_revision: str | Sequence[str] | None = 'u3j9k5g1h544'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # update_health enum already exists from c9a7ba46a2b0_initial (project_updates).
    # Re-declare it with create_type=False so the column references the existing
    # type without alembic trying to CREATE TYPE a second time on Postgres.
    health_enum = sa.Enum('onTrack', 'atRisk', 'offTrack', name='update_health', create_type=False)
    op.create_table(
        'initiative_updates',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('initiative_id', sa.String(length=36), nullable=False, index=True),
        sa.Column('author_id', sa.String(length=36), nullable=True),
        sa.Column('body', sa.Text(), nullable=False, server_default=''),
        sa.Column('health', health_enum, nullable=False, server_default='onTrack'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['initiative_id'], ['initiatives.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['members.id'], ondelete='SET NULL'),
    )


def downgrade() -> None:
    op.drop_table('initiative_updates')
