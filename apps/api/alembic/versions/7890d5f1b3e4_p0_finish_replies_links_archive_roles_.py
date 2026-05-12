"""p0 finish: replies, links, archive, roles, estimate scale

Revision ID: 7890d5f1b3e4
Revises: 2146d0d2d936
Create Date: 2026-05-12 20:48:36.972334

"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '7890d5f1b3e4'
down_revision: str | Sequence[str] | None = '2146d0d2d936'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Enums used via op.add_column (rather than op.create_table) are NOT
    # auto-created by SQLAlchemy on Postgres — pre-create them.
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        postgresql.ENUM('admin', 'member', 'guest', name='member_role').create(bind, checkfirst=True)
        postgresql.ENUM('none', 'linear', 'fibonacci', 'exponential', 'tshirt', name='estimate_scale').create(bind, checkfirst=True)

    op.create_table(
        'team_memberships',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('team_id', sa.String(length=36), nullable=False),
        sa.Column('member_id', sa.String(length=36), nullable=False),
        sa.Column('role', sa.Enum('admin', 'member', 'guest', name='team_member_role'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], name=op.f('fk_team_memberships_member_id_members'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], name=op.f('fk_team_memberships_team_id_teams'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_team_memberships')),
        sa.UniqueConstraint('team_id', 'member_id', name='uq_team_memberships_team_member'),
    )
    op.create_index(op.f('ix_team_memberships_member_id'), 'team_memberships', ['member_id'], unique=False)
    op.create_index(op.f('ix_team_memberships_team_id'), 'team_memberships', ['team_id'], unique=False)

    op.create_table(
        'issue_links',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('issue_id', sa.String(length=36), nullable=False),
        sa.Column('url', sa.String(length=1024), nullable=False),
        sa.Column('title', sa.String(length=512), nullable=False, server_default=''),
        sa.Column('type', sa.Enum('github_pr', 'github_branch', 'figma', 'url', name='issue_link_type'), nullable=False, server_default='url'),
        sa.Column('status', sa.Enum('open', 'merged', 'closed', 'draft', name='issue_link_status'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], name=op.f('fk_issue_links_issue_id_issues'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_issue_links')),
    )
    op.create_index(op.f('ix_issue_links_issue_id'), 'issue_links', ['issue_id'], unique=False)

    # SQLite needs batch_alter_table for FK changes; use it for all ALTERs.
    with op.batch_alter_table('comments') as b:
        b.add_column(sa.Column('parent_id', sa.String(length=36), nullable=True))
        b.create_foreign_key(
            'fk_comments_parent_id_comments', 'comments', ['parent_id'], ['id'], ondelete='CASCADE'
        )
    op.create_index(op.f('ix_comments_parent_id'), 'comments', ['parent_id'], unique=False)

    op.add_column('issues', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_issues_archived_at'), 'issues', ['archived_at'], unique=False)

    # Default existing rows to 'member' for role and 'fibonacci' for estimate_scale.
    op.add_column(
        'members',
        sa.Column('role', sa.Enum('admin', 'member', 'guest', name='member_role'), nullable=False, server_default='member'),
    )
    op.add_column(
        'teams',
        sa.Column('estimate_scale', sa.Enum('none', 'linear', 'fibonacci', 'exponential', 'tshirt', name='estimate_scale'), nullable=False, server_default='fibonacci'),
    )


def downgrade() -> None:
    op.drop_column('teams', 'estimate_scale')
    op.drop_column('members', 'role')
    op.drop_index(op.f('ix_issues_archived_at'), table_name='issues')
    op.drop_column('issues', 'archived_at')
    with op.batch_alter_table('comments') as b:
        b.drop_constraint('fk_comments_parent_id_comments', type_='foreignkey')
        b.drop_index(op.f('ix_comments_parent_id'))
        b.drop_column('parent_id')
    op.drop_index(op.f('ix_issue_links_issue_id'), table_name='issue_links')
    op.drop_table('issue_links')
    op.drop_index(op.f('ix_team_memberships_team_id'), table_name='team_memberships')
    op.drop_index(op.f('ix_team_memberships_member_id'), table_name='team_memberships')
    op.drop_table('team_memberships')
