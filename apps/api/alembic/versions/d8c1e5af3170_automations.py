"""automations

Workflow rule engine: trigger + action with JSON configs. Pre-creates PG
ENUM types for trigger and action.

Revision ID: d8c1e5af3170
Revises: c2a98d3f4b21
Create Date: 2026-05-13 06:30:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd8c1e5af3170'
down_revision: str | Sequence[str] | None = 'c2a98d3f4b21'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


TRIGGER_VALUES = ('on_issue_create', 'on_status_change', 'on_label_added', 'on_cycle_end', 'stale_in_state')
ACTION_VALUES = ('move_to_state', 'assign_to_member', 'add_label', 'add_comment', 'archive', 'set_priority', 'rotate_assign')


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("DROP TYPE IF EXISTS automation_trigger CASCADE")
        op.execute("DROP TYPE IF EXISTS automation_action CASCADE")
        postgresql.ENUM(*TRIGGER_VALUES, name='automation_trigger').create(bind, checkfirst=False)
        postgresql.ENUM(*ACTION_VALUES, name='automation_action').create(bind, checkfirst=False)
        trigger_type = postgresql.ENUM(*TRIGGER_VALUES, name='automation_trigger', create_type=False)
        action_type = postgresql.ENUM(*ACTION_VALUES, name='automation_action', create_type=False)
    else:
        trigger_type = sa.Enum(*TRIGGER_VALUES, name='automation_trigger')
        action_type = sa.Enum(*ACTION_VALUES, name='automation_action')

    op.create_table(
        'automations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('workspace_id', sa.String(length=36), nullable=False),
        sa.Column('team_id', sa.String(length=36), nullable=True),
        sa.Column('name', sa.String(length=160), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('trigger', trigger_type, nullable=False),
        sa.Column('trigger_config', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('action', action_type, nullable=False),
        sa.Column('action_config', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], name=op.f('fk_automations_workspace_id_workspaces'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], name=op.f('fk_automations_team_id_teams'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_automations')),
    )
    op.create_index(op.f('ix_automations_workspace_id'), 'automations', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_automations_team_id'), 'automations', ['team_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_automations_team_id'), table_name='automations')
    op.drop_index(op.f('ix_automations_workspace_id'), table_name='automations')
    op.drop_table('automations')
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute('DROP TYPE IF EXISTS automation_action')
        op.execute('DROP TYPE IF EXISTS automation_trigger')
