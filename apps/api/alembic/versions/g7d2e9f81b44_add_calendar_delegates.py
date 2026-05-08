"""add calendar_delegates table

Revision ID: g7d2e9f81b44
Revises: f4c8a2b15d3a
Create Date: 2026-05-08 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g7d2e9f81b44"
down_revision: Union[str, None] = "f4c8a2b15d3a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LEVEL_ENUM_NAME = "calendar_delegate_level_enum"
# create_type=False so the table-create hook doesn't re-CREATE TYPE.
LEVEL_COL_ENUM = sa.Enum(
    "free_busy", "reviewer", "editor", name=LEVEL_ENUM_NAME, create_type=False
)


def upgrade() -> None:
    sa.Enum("free_busy", "reviewer", "editor", name=LEVEL_ENUM_NAME).create(
        op.get_bind(), checkfirst=True
    )
    op.create_table(
        "calendar_delegates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), nullable=False),
        sa.Column("delegate_user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "level",
            LEVEL_COL_ENUM,
            nullable=False,
            server_default="reviewer",
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False
        ),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["delegate_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "owner_user_id", "delegate_user_id", name="uq_calendar_delegate"
        ),
    )


def downgrade() -> None:
    op.drop_table("calendar_delegates")
    sa.Enum(name=LEVEL_ENUM_NAME).drop(op.get_bind(), checkfirst=True)
