"""add file_size to documents

Revision ID: 0004_add_file_size_to_documents
Revises: 0003_add_is_favorite_to_templates
Create Date: 2026-05-02 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_add_file_size_to_documents'
down_revision: Union[str, None] = '0003_add_favorite_to_templates'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'documents',
        sa.Column('file_size', sa.Integer(), nullable=False, server_default=sa.text('0')),
    )


def downgrade() -> None:
    op.drop_column('documents', 'file_size')
