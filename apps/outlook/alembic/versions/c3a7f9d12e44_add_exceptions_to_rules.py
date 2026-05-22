"""add exceptions to rules

Revision ID: c3a7f9d12e44
Revises: b1e0f2c84a01
Create Date: 2026-05-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c3a7f9d12e44"
down_revision: Union[str, None] = "b1e0f2c84a01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "rules",
        sa.Column(
            "exceptions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("rules", "exceptions")
