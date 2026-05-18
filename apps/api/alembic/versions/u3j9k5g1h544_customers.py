"""customers table + customer_id FK on customer_requests

Adds a workspace-scoped Customer entity (logo, owner, status, tier,
annual_revenue, size, domains) and wires existing CustomerRequest rows
to it via an optional customer_id FK so the new /customers page can
group requests by their owning organization without breaking the old
free-text customer_name flow.

Revision ID: u3j9k5g1h544
Revises: t2i8j4f0g433
Create Date: 2026-05-19 12:00:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'u3j9k5g1h544'
down_revision: str | Sequence[str] | None = 't2i8j4f0g433'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'customers',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('workspace_id', sa.String(length=36), nullable=False, index=True),
        sa.Column('slug', sa.String(length=128), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('owner_id', sa.String(length=36), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='active'),
        sa.Column('tier', sa.String(length=64), nullable=True),
        # Whole dollars per year. NULL = unknown.
        sa.Column('annual_revenue', sa.Integer(), nullable=True),
        # Number of employees / seat count. NULL = unknown.
        sa.Column('size', sa.Integer(), nullable=True),
        sa.Column('logo_url', sa.Text(), nullable=True),
        # JSON-encoded list of strings — same Text-with-json pattern used
        # elsewhere (members.sidebar_prefs, invite.team_keys) so SQLite
        # and Postgres both stay happy.
        sa.Column('domains', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['members.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('workspace_id', 'slug', name='uq_customers_workspace_slug'),
    )

    with op.batch_alter_table('customer_requests') as batch_op:
        batch_op.add_column(sa.Column('customer_id', sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            'fk_customer_requests_customer_id_customers',
            'customers',
            ['customer_id'], ['id'],
            ondelete='SET NULL',
        )
        batch_op.add_column(sa.Column('is_important', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table('customer_requests') as batch_op:
        batch_op.drop_constraint('fk_customer_requests_customer_id_customers', type_='foreignkey')
        batch_op.drop_column('customer_id')
        batch_op.drop_column('is_important')
    op.drop_table('customers')
