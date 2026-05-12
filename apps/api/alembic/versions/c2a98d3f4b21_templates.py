"""templates

Adds a single `templates` table that backs issue / project / document templates.
`kind` is a PG enum (with the standard pre-create dance for ENUM types).

Revision ID: c2a98d3f4b21
Revises: b51f0a92c4d1
Create Date: 2026-05-13 06:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c2a98d3f4b21'
down_revision: str | Sequence[str] | None = 'b51f0a92c4d1'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        postgresql.ENUM('issue', 'project', 'document', name='template_kind').create(bind, checkfirst=True)

    op.create_table(
        'templates',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('workspace_id', sa.String(length=36), nullable=False),
        sa.Column('team_id', sa.String(length=36), nullable=True),
        sa.Column('kind', sa.Enum('issue', 'project', 'document', name='template_kind', create_type=False), nullable=False),
        sa.Column('name', sa.String(length=160), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('body', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], name=op.f('fk_templates_workspace_id_workspaces'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], name=op.f('fk_templates_team_id_teams'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_templates')),
    )
    op.create_index(op.f('ix_templates_workspace_id'), 'templates', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_templates_team_id'), 'templates', ['team_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_templates_team_id'), table_name='templates')
    op.drop_index(op.f('ix_templates_workspace_id'), table_name='templates')
    op.drop_table('templates')
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute('DROP TYPE IF EXISTS template_kind')
