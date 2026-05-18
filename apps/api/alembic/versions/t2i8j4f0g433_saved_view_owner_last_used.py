"""saved view owner + last_used_at

Adds:
- saved_views.owner_id (FK members, nullable) — workspace-scoped views
  with an owner_id are "personal" to that member; workspace-shared
  views leave owner_id null. Replaces the visual-only Personal /
  Workspace split on /views.
- saved_views.last_used_at (timestamp, nullable) — bumped every time
  the view is opened, used for the "Last used" column + sort.

Revision ID: t2i8j4f0g433
Revises: s1h7i3e9f322
Create Date: 2026-05-19 10:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 't2i8j4f0g433'
down_revision: str | Sequence[str] | None = 's1h7i3e9f322'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('saved_views') as batch_op:
        batch_op.add_column(sa.Column('owner_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.create_foreign_key(
            'fk_saved_views_owner_id_members',
            'members',
            ['owner_id'], ['id'],
            ondelete='SET NULL',
        )


def downgrade() -> None:
    with op.batch_alter_table('saved_views') as batch_op:
        batch_op.drop_constraint('fk_saved_views_owner_id_members', type_='foreignkey')
        batch_op.drop_column('last_used_at')
        batch_op.drop_column('owner_id')
