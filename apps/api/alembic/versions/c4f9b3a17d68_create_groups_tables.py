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


PRIVACY_ENUM = sa.Enum("public", "private", name="group_privacy_enum")
ROLE_ENUM = sa.Enum("member", "owner", name="group_role_enum")


def upgrade() -> None:
    PRIVACY_ENUM.create(op.get_bind(), checkfirst=True)
    ROLE_ENUM.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "groups",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("world_id", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("email", sa.String(length=500), nullable=False),
        sa.Column("privacy", PRIVACY_ENUM, nullable=False, server_default="public"),
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
        sa.Column("role", ROLE_ENUM, nullable=False, server_default="member"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "user_id", name="uq_group_member"),
    )


def downgrade() -> None:
    op.drop_table("group_members")
    op.drop_table("groups")
    ROLE_ENUM.drop(op.get_bind(), checkfirst=True)
    PRIVACY_ENUM.drop(op.get_bind(), checkfirst=True)
