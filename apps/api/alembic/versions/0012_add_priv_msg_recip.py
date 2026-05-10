"""Add private_message column to recipients table

Revision ID: 0012_add_priv_msg_recip
Revises: 0011_add_password_reset_to_users
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = '0012_add_priv_msg_recip'
down_revision: Union[str, None] = '0011_add_password_reset_to_users'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('recipients', sa.Column('private_message', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('recipients', 'private_message')
