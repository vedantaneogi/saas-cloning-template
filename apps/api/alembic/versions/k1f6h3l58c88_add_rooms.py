"""create rooms table

Revision ID: k1f6h3l58c88
Revises: j0e5h2k47b77
Create Date: 2026-05-09 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM


revision: str = "k1f6h3l58c88"
down_revision: Union[str, None] = "j0e5h2k47b77"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ROOM_STATUS_ENUM_NAME = "room_status_enum"
ROOM_STATUS_COL_ENUM = PG_ENUM("available", "busy", name=ROOM_STATUS_ENUM_NAME, create_type=False)


def upgrade() -> None:
    op.execute(
        f"DO $$ BEGIN CREATE TYPE {ROOM_STATUS_ENUM_NAME} AS ENUM ('available','busy');"
        f" EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.create_table(
        "rooms",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("capacity", sa.Integer, nullable=False, server_default="4"),
        sa.Column("status", ROOM_STATUS_COL_ENUM, nullable=False, server_default="available"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )


def downgrade() -> None:
    op.drop_table("rooms")
    op.execute(f"DROP TYPE IF EXISTS {ROOM_STATUS_ENUM_NAME}")
