"""Add P1 features: batch_id on envelopes, access_code on recipients, comments table

Revision ID: 0007_p1_features
Revises: 0006_expand_fieldtype_enum
Create Date: 2026-05-02 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = '0007_p1_features'
down_revision: Union[str, None] = '0006_expand_fieldtype_enum'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add batch_id to envelopes (nullable VARCHAR for simplicity)
    op.add_column('envelopes', sa.Column('batch_id', sa.String(64), nullable=True, index=True))

    # 2. Add access_code to recipients (nullable)
    op.add_column('recipients', sa.Column('access_code', sa.String(64), nullable=True))

    # 3. Create comments table
    op.create_table(
        'comments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('envelope_id', UUID(as_uuid=True), sa.ForeignKey('envelopes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('text', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('comments')
    op.drop_column('recipients', 'access_code')
    op.drop_column('envelopes', 'batch_id')
