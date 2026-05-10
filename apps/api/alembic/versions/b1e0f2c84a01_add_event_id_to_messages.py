"""add event_id to messages

Revision ID: b1e0f2c84a01
Revises: a846ec540c54
Create Date: 2026-05-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1e0f2c84a01"
down_revision: Union[str, None] = "a846ec540c54"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "messages",
        sa.Column("event_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_messages_event_id_events",
        "messages",
        "events",
        ["event_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_messages_event_id_events", "messages", type_="foreignkey")
    op.drop_column("messages", "event_id")
