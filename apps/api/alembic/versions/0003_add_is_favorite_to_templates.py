"""add is_favorite to templates

Revision ID: 0003_add_is_favorite_to_templates
Revises: 0002_add_core_models
Create Date: 2026-05-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_add_is_favorite_to_templates'
down_revision: Union[str, None] = '0002_add_core_models'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'templates',
        sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )


def downgrade() -> None:
    op.drop_column('templates', 'is_favorite')
