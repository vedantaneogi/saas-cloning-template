"""create groups and group_members tables

The original initial migration was authored before the Groups feature
landed, so on a fresh DB those tables only existed via create_all. This
shim creates them in alembic's chain so subsequent migrations (notably
d5e4a712f33b which adds group_members.is_favorite) have something to
ALTER.

Revision ID: c4f9b3a17d68
Revises: c3a7f9d12e44
Create Date: 2026-05-08 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4f9b3a17d68"
down_revision: Union[str, None] = "c3a7f9d12e44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PRIVACY_ENUM_NAME = "group_privacy_enum"
ROLE_ENUM_NAME = "group_role_enum"

# create_type=False so the table-create hook doesn't try to CREATE TYPE again
# (we explicitly create them at the top of upgrade() with checkfirst=True).
PRIVACY_COL_ENUM = sa.Enum(
    "public", "private", name=PRIVACY_ENUM_NAME, create_type=False
)
ROLE_COL_ENUM = sa.Enum(
    "member", "owner", name=ROLE_ENUM_NAME, create_type=False
)


def upgrade() -> None:
    sa.Enum("public", "private", name=PRIVACY_ENUM_NAME).create(
        op.get_bind(), checkfirst=True
    )
    sa.Enum("member", "owner", name=ROLE_ENUM_NAME).create(
        op.get_bind(), checkfirst=True
    )

    op.create_table(
        "groups",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("world_id", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("email", sa.String(length=500), nullable=False),
        sa.Column("privacy", PRIVACY_COL_ENUM, nullable=False, server_default="public"),
        sa.Column("color", sa.String(length=20), nullable=False, server_default="#0078D4"),
        sa.Column("member_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "group_members",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("group_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", ROLE_COL_ENUM, nullable=False, server_default="member"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "user_id", name="uq_group_member"),
    )


def downgrade() -> None:
    op.drop_table("group_members")
    op.drop_table("groups")
    sa.Enum(name=ROLE_ENUM_NAME).drop(op.get_bind(), checkfirst=True)
    sa.Enum(name=PRIVACY_ENUM_NAME).drop(op.get_bind(), checkfirst=True)
