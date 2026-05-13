"""workspace integrations

Per-workspace webhook configurations for GitHub / Slack / Figma. Secrets and
per-integration knobs live in the JSON `config` column.

Revision ID: g4e8f1a72e95
Revises: f9d7a3e21188
Create Date: 2026-05-13 08:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'g4e8f1a72e95'
down_revision: str | Sequence[str] | None = 'f9d7a3e21188'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("DROP TYPE IF EXISTS integration_kind CASCADE")
        postgresql.ENUM('github', 'slack', 'figma', name='integration_kind').create(bind, checkfirst=False)
        kind_type = postgresql.ENUM('github', 'slack', 'figma', name='integration_kind', create_type=False)
    else:
        kind_type = sa.Enum('github', 'slack', 'figma', name='integration_kind')

    op.create_table(
        'workspace_integrations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('workspace_id', sa.String(length=36), nullable=False),
        sa.Column('kind', kind_type, nullable=False),
        sa.Column('config', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], name=op.f('fk_workspace_integrations_workspace_id_workspaces'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_workspace_integrations')),
        sa.UniqueConstraint('workspace_id', 'kind', name='uq_workspace_integrations'),
    )
    op.create_index(op.f('ix_workspace_integrations_workspace_id'), 'workspace_integrations', ['workspace_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_workspace_integrations_workspace_id'), table_name='workspace_integrations')
    op.drop_table('workspace_integrations')
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute('DROP TYPE IF EXISTS integration_kind')
