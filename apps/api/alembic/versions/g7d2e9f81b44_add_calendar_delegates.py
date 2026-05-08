"""add calendar_delegates table

Revision ID: g7d2e9f81b44
Revises: f4c8a2b15d3a
Create Date: 2026-05-08 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM


revision: str = "g7d2e9f81b44"
down_revision: Union[str, None] = "f4c8a2b15d3a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LEVEL_ENUM_NAME = "calendar_delegate_level_enum"
LEVEL_COL_ENUM = PG_ENUM(
    "free_busy", "reviewer", "editor", name=LEVEL_ENUM_NAME, create_type=False
)


def upgrade() -> None:
    op.execute(
        f"DO $$ BEGIN CREATE TYPE {LEVEL_ENUM_NAME} AS ENUM"
        f" ('free_busy','reviewer','editor');"
        f" EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
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
    op.execute(f"DROP TYPE IF EXISTS {LEVEL_ENUM_NAME}")
