"""add reminder_days to envelopes

Revision ID: 0005_add_reminder_days_envelopes
Revises: 0004_add_file_size_to_documents
Create Date: 2026-05-02 00:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005_add_reminder_days_envelopes'
down_revision: Union[str, None] = '0004_add_file_size_to_documents'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'envelopes',
        sa.Column('reminder_days', sa.Integer(), nullable=False, server_default=sa.text('0')),
    )


def downgrade() -> None:
    op.drop_column('envelopes', 'reminder_days')
