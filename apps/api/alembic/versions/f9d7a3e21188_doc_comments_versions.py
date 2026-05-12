"""document comments + versions

Revision ID: f9d7a3e21188
Revises: e57b2f9c8a44
Create Date: 2026-05-13 07:30:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = 'f9d7a3e21188'
down_revision: str | Sequence[str] | None = 'e57b2f9c8a44'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'document_comments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('document_id', sa.String(length=36), nullable=False),
        sa.Column('author_id', sa.String(length=36), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('parent_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], name=op.f('fk_document_comments_document_id_documents'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['members.id'], name=op.f('fk_document_comments_author_id_members'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_id'], ['document_comments.id'], name=op.f('fk_document_comments_parent_id_document_comments'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_document_comments')),
    )
    op.create_index(op.f('ix_document_comments_document_id'), 'document_comments', ['document_id'], unique=False)
    op.create_index(op.f('ix_document_comments_parent_id'), 'document_comments', ['parent_id'], unique=False)

    op.create_table(
        'document_versions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('document_id', sa.String(length=36), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False, server_default=''),
        sa.Column('body', sa.Text(), nullable=False, server_default=''),
        sa.Column('author_id', sa.String(length=36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], name=op.f('fk_document_versions_document_id_documents'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['members.id'], name=op.f('fk_document_versions_author_id_members'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_document_versions')),
    )
    op.create_index(op.f('ix_document_versions_document_id'), 'document_versions', ['document_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_document_versions_document_id'), table_name='document_versions')
    op.drop_table('document_versions')
    op.drop_index(op.f('ix_document_comments_parent_id'), table_name='document_comments')
    op.drop_index(op.f('ix_document_comments_document_id'), table_name='document_comments')
    op.drop_table('document_comments')
