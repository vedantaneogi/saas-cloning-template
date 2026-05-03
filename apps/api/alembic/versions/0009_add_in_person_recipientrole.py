"""Add in_person value to recipientrole enum

Revision ID: 0009_add_in_person_recipientrole
Revises: 0008_add_payment_fieldtype
Create Date: 2026-05-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = '0009_add_in_person_recipientrole'
down_revision: Union[str, None] = '0008_add_payment_fieldtype'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL native enum types require ALTER TYPE to add new values.
    # IF NOT EXISTS guard prevents error on repeated runs.
    op.execute("ALTER TYPE recipientrole ADD VALUE IF NOT EXISTS 'in_person'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values without recreating the type.
    # Downgrade is a no-op; the value remains but is unused.
    pass
