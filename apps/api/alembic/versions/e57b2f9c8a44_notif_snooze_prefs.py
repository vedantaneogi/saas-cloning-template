"""notification snooze + preferences

- Adds notifications.snoozed_until (nullable timestamp).
- Adds notification_preferences table.

Revision ID: e57b2f9c8a44
Revises: d8c1e5af3170
Create Date: 2026-05-13 07:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = 'e57b2f9c8a44'
down_revision: str | Sequence[str] | None = 'd8c1e5af3170'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('notifications') as b:
        b.add_column(sa.Column('snoozed_until', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_notifications_snoozed_until'), 'notifications', ['snoozed_until'], unique=False)

    op.create_table(
        'notification_preferences',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('member_id', sa.String(length=36), nullable=False),
        sa.Column('scope_type', sa.String(length=16), nullable=False),
        sa.Column('scope_id', sa.String(length=36), nullable=False),
        sa.Column('muted', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], name=op.f('fk_notification_preferences_member_id_members'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_notification_preferences')),
        sa.UniqueConstraint('member_id', 'scope_type', 'scope_id', name='uq_notif_prefs_member_scope'),
    )
    op.create_index(op.f('ix_notification_preferences_member_id'), 'notification_preferences', ['member_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notification_preferences_member_id'), table_name='notification_preferences')
    op.drop_table('notification_preferences')
    op.drop_index(op.f('ix_notifications_snoozed_until'), table_name='notifications')
    with op.batch_alter_table('notifications') as b:
        b.drop_column('snoozed_until')
