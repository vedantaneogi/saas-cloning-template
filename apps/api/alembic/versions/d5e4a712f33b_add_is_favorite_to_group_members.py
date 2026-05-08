"""add is_favorite to group_members

Revision ID: d5e4a712f33b
Revises: c3a7f9d12e44
Create Date: 2026-05-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5e4a712f33b"
down_revision: Union[str, None] = "c4f9b3a17d68"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "group_members",
        sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("group_members", "is_favorite")
