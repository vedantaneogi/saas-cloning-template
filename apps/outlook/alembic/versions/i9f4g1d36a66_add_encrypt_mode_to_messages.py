"""add encrypt_mode to messages

Revision ID: i9f4g1d36a66
Revises: h8e3f0c25e55
Create Date: 2026-05-08 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM


revision: str = "i9f4g1d36a66"
down_revision: Union[str, None] = "h8e3f0c25e55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ENCRYPT_MODE_ENUM_NAME = "encrypt_mode_enum"
ENCRYPT_MODE_COL_ENUM = PG_ENUM(
    "none",
    "company_confidential",
    "company_confidential_view_only",
    "do_not_forward",
    "encrypt_only",
    name=ENCRYPT_MODE_ENUM_NAME,
    create_type=False,
)


def upgrade() -> None:
    op.execute(
        f"DO $$ BEGIN CREATE TYPE {ENCRYPT_MODE_ENUM_NAME} AS ENUM"
        f" ('none','company_confidential','company_confidential_view_only',"
        f"'do_not_forward','encrypt_only');"
        f" EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.add_column(
        "messages",
        sa.Column(
            "encrypt_mode",
            ENCRYPT_MODE_COL_ENUM,
            nullable=False,
            server_default="none",
        ),
    )


def downgrade() -> None:
    op.drop_column("messages", "encrypt_mode")
    op.execute(f"DROP TYPE IF EXISTS {ENCRYPT_MODE_ENUM_NAME}")
