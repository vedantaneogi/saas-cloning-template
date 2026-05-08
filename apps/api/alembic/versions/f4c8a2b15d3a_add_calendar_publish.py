"""add calendar publish_token and publish_scope

Revision ID: f4c8a2b15d3a
Revises: e8f1c4a09b22
Create Date: 2026-05-08 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f4c8a2b15d3a"
down_revision: Union[str, None] = "e8f1c4a09b22"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SCOPE_ENUM = sa.Enum("free_busy", "full", name="calendar_publish_scope_enum")


def upgrade() -> None:
    op.add_column(
        "calendars",
        sa.Column("publish_token", sa.String(length=64), nullable=True),
    )
    op.create_unique_constraint(
        "uq_calendars_publish_token", "calendars", ["publish_token"]
    )
    SCOPE_ENUM.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "calendars",
        sa.Column(
            "publish_scope",
            SCOPE_ENUM,
            nullable=False,
            server_default="free_busy",
        ),
    )


def downgrade() -> None:
    op.drop_column("calendars", "publish_scope")
    op.drop_constraint("uq_calendars_publish_token", "calendars", type_="unique")
    op.drop_column("calendars", "publish_token")
    SCOPE_ENUM.drop(op.get_bind(), checkfirst=True)
