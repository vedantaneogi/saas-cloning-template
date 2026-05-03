"""add_presentation_collaborators

Revision ID: a1b2c3d4e5f6
Revises: 1e92573eb44b
Create Date: 2026-04-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '1e92573eb44b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'presentation_collaborators',
        sa.Column(
            'id',
            sa.UUID(),
            server_default=sa.text('gen_random_uuid()'),
            nullable=False,
        ),
        sa.Column('presentation_id', sa.UUID(), nullable=False),
        sa.Column('collaborator_email', sa.String(length=320), nullable=False),
        sa.Column(
            'role',
            sa.String(length=16),
            server_default='viewer',
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
            name=op.f('fk_presentation_collaborators_presentation_id_decks'),
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_presentation_collaborators')),
        sa.UniqueConstraint(
            'presentation_id',
            'collaborator_email',
            name='uq_presentation_collaborator_email',
        ),
    )
    op.create_index(
        op.f('ix_presentation_collaborators_presentation_id'),
        'presentation_collaborators',
        ['presentation_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_presentation_collaborators_collaborator_email'),
        'presentation_collaborators',
        ['collaborator_email'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_presentation_collaborators_collaborator_email'),
        table_name='presentation_collaborators',
    )
    op.drop_index(
        op.f('ix_presentation_collaborators_presentation_id'),
        table_name='presentation_collaborators',
    )
    op.drop_table('presentation_collaborators')
