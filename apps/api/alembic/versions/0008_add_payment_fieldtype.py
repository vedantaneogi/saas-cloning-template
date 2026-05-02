"""Add payment to fieldtype enum

Revision ID: 0008_add_payment_fieldtype
Revises: 0007_p1_features
Create Date: 2026-05-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = '0008_add_payment_fieldtype'
down_revision: Union[str, None] = '0007_p1_features'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        __import__('sqlalchemy').text(
            "ALTER TYPE fieldtype ADD VALUE IF NOT EXISTS 'payment'"
        )
    )


def downgrade() -> None:
    # Postgres does not support removing enum values.
    pass
