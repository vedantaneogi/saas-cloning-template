"""Add preview_filename column to documents table

Revision ID: 0010_add_preview_filename_to_documents
Revises: 0009_add_in_person_recipientrole
Create Date: 2026-05-03 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '0010_add_preview_filename_to_documents'
down_revision: Union[str, None] = '0009_add_in_person_recipientrole'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'documents',
        sa.Column('preview_filename', sa.String(512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('documents', 'preview_filename')
