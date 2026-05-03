"""add_presentation_versions

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'presentation_versions',
        sa.Column(
            'id',
            sa.UUID(),
            server_default=sa.text('gen_random_uuid()'),
            nullable=False,
        ),
        sa.Column('presentation_id', sa.UUID(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('label', sa.Text(), nullable=True),
        sa.Column(
            'content',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['presentation_id'],
            ['decks.id'],
            name=op.f('fk_presentation_versions_presentation_id_decks'),
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['author_id'],
            ['users.id'],
            name=op.f('fk_presentation_versions_author_id_users'),
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_presentation_versions')),
        sa.UniqueConstraint(
            'presentation_id',
            'version_number',
            name='uq_presentation_version_number',
        ),
    )
    op.create_index(
        op.f('ix_presentation_versions_presentation_id'),
        'presentation_versions',
        ['presentation_id'],
        unique=False,
    )
    op.create_index(
        'ix_presentation_versions_deck_created',
        'presentation_versions',
        ['presentation_id', sa.text('created_at DESC')],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        'ix_presentation_versions_deck_created',
        table_name='presentation_versions',
    )
    op.drop_index(
        op.f('ix_presentation_versions_presentation_id'),
        table_name='presentation_versions',
    )
    op.drop_table('presentation_versions')
