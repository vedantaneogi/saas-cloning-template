"""Expand fieldtype enum to match frontend FieldType palette

Revision ID: 0006_expand_fieldtype_enum
Revises: 0005_add_reminder_days_to_envelopes
Create Date: 2026-05-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '0006_expand_fieldtype_enum'
down_revision: Union[str, None] = '0005_add_reminder_days_envelopes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Values to add to the Postgres `fieldtype` enum.
NEW_VALUES = [
    'name',
    'email',
    'company',
    'title',
    'number',
    'approve',
    'decline',
    'stamp',
    'note',
    'formula',
    'drawing',
]


def upgrade() -> None:
    # Postgres requires ALTER TYPE … ADD VALUE to be run outside a transaction
    # when the type is used by existing tables.  Alembic's op.execute runs
    # inside the current transaction by default, so we use `get_context().bind`
    # to execute each statement with autocommit.
    connection = op.get_bind()
    for value in NEW_VALUES:
        # IF NOT EXISTS is available in Postgres 9.6+; safe to run repeatedly.
        connection.execute(
            # Use text() to avoid parameter binding issues with identifiers.
            __import__('sqlalchemy').text(
                f"ALTER TYPE fieldtype ADD VALUE IF NOT EXISTS '{value}'"
            )
        )


def downgrade() -> None:
    # Postgres does not support removing values from an enum type.
    # A full downgrade would require recreating the type and migrating data,
    # which is destructive.  We intentionally leave this as a no-op and
    # document it here.
    pass
