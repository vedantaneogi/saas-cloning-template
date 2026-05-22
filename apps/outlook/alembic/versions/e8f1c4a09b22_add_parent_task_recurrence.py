"""add parent_task_id and recurrence_rule to tasks

Revision ID: e8f1c4a09b22
Revises: d5e4a712f33b
Create Date: 2026-05-08 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e8f1c4a09b22"
down_revision: Union[str, None] = "d5e4a712f33b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("parent_task_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_tasks_parent_task_id",
        "tasks",
        "tasks",
        ["parent_task_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.add_column(
        "tasks",
        sa.Column(
            "recurrence_rule",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("tasks", "recurrence_rule")
    op.drop_constraint("fk_tasks_parent_task_id", "tasks", type_="foreignkey")
    op.drop_column("tasks", "parent_task_id")
