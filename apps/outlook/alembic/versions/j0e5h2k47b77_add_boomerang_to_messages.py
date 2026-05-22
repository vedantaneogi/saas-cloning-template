"""add boomerang follow-up columns to messages

Revision ID: j0e5h2k47b77
Revises: i9f4g1d36a66
Create Date: 2026-05-08 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "j0e5h2k47b77"
down_revision: Union[str, None] = "i9f4g1d36a66"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "messages",
        sa.Column("boomerang_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "messages",
        sa.Column("boomerang_fired_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Index — opportunistic sweep filters by (boomerang_at IS NOT NULL AND
    # boomerang_at <= now AND boomerang_fired_at IS NULL), so an index on
    # boomerang_at where fired is null keeps the per-list-call cost flat
    # even after years of sent mail.
    op.create_index(
        "idx_messages_boomerang_pending",
        "messages",
        ["user_id", "boomerang_at"],
        postgresql_where=sa.text("boomerang_at IS NOT NULL AND boomerang_fired_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("idx_messages_boomerang_pending", table_name="messages")
    op.drop_column("messages", "boomerang_fired_at")
    op.drop_column("messages", "boomerang_at")
