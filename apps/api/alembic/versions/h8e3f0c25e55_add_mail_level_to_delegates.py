"""add mail_level to calendar_delegates

Revision ID: h8e3f0c25e55
Revises: g7d2e9f81b44
Create Date: 2026-05-08 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h8e3f0c25e55"
down_revision: Union[str, None] = "g7d2e9f81b44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


MAIL_LEVEL_ENUM_NAME = "mail_delegate_level_enum"
MAIL_LEVEL_COL_ENUM = sa.Enum(
    "none", "read", "send_on_behalf", "send_as",
    name=MAIL_LEVEL_ENUM_NAME, create_type=False,
)


def upgrade() -> None:
    sa.Enum(
        "none", "read", "send_on_behalf", "send_as", name=MAIL_LEVEL_ENUM_NAME
    ).create(op.get_bind(), checkfirst=True)
    op.add_column(
        "calendar_delegates",
        sa.Column(
            "mail_level",
            MAIL_LEVEL_COL_ENUM,
            nullable=False,
            server_default="none",
        ),
    )


def downgrade() -> None:
    op.drop_column("calendar_delegates", "mail_level")
    sa.Enum(name=MAIL_LEVEL_ENUM_NAME).drop(op.get_bind(), checkfirst=True)
