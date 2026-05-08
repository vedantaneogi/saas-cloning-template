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


MAIL_LEVEL_ENUM = sa.Enum(
    "none", "read", "send_on_behalf", "send_as", name="mail_delegate_level_enum"
)


def upgrade() -> None:
    MAIL_LEVEL_ENUM.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "calendar_delegates",
        sa.Column(
            "mail_level",
            MAIL_LEVEL_ENUM,
            nullable=False,
            server_default="none",
        ),
    )


def downgrade() -> None:
    op.drop_column("calendar_delegates", "mail_level")
    MAIL_LEVEL_ENUM.drop(op.get_bind(), checkfirst=True)
