"""add core models: envelopes, documents, recipients, fields, audit_events, templates, contacts

Revision ID: 0002_add_core_models
Revises: 0001_add_users_table
Create Date: 2026-05-01 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0002_add_core_models'
down_revision: Union[str, None] = '0001_add_users_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    envelope_status = postgresql.ENUM(
        'draft', 'sent', 'delivered', 'completed', 'declined', 'voided',
        name='envelopestatus',
        create_type=True,
    )
    envelope_status.create(op.get_bind(), checkfirst=True)

    recipient_role = postgresql.ENUM(
        'signer', 'cc', 'viewer', 'approver',
        name='recipientrole',
        create_type=True,
    )
    recipient_role.create(op.get_bind(), checkfirst=True)

    recipient_status = postgresql.ENUM(
        'pending', 'sent', 'delivered', 'signed', 'declined',
        name='recipientstatus',
        create_type=True,
    )
    recipient_status.create(op.get_bind(), checkfirst=True)

    field_type = postgresql.ENUM(
        'signature', 'initial', 'date_signed', 'text', 'checkbox', 'dropdown', 'radio', 'attachment',
        name='fieldtype',
        create_type=True,
    )
    field_type.create(op.get_bind(), checkfirst=True)

    # Envelopes table
    op.create_table(
        'envelopes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('subject', sa.String(length=512), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('draft', 'sent', 'delivered', 'completed', 'declined', 'voided', name='envelopestatus', create_type=False), nullable=False, server_default='draft'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_envelopes_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_envelopes')),
    )
    op.create_index(op.f('ix_envelopes_user_id'), 'envelopes', ['user_id'], unique=False)
    op.create_index(op.f('ix_envelopes_status'), 'envelopes', ['status'], unique=False)

    # Documents table
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('envelope_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('filename', sa.String(length=512), nullable=False),
        sa.Column('original_filename', sa.String(length=512), nullable=False),
        sa.Column('file_path', sa.Text(), nullable=False),
        sa.Column('page_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['envelope_id'], ['envelopes.id'], name=op.f('fk_documents_envelope_id_envelopes'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_documents')),
    )
    op.create_index(op.f('ix_documents_envelope_id'), 'documents', ['envelope_id'], unique=False)

    # Recipients table
    op.create_table(
        'recipients',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('envelope_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('role', sa.Enum('signer', 'cc', 'viewer', 'approver', name='recipientrole', create_type=False), nullable=False, server_default='signer'),
        sa.Column('routing_order', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.Enum('pending', 'sent', 'delivered', 'signed', 'declined', name='recipientstatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('signing_token', sa.String(length=128), nullable=False),
        sa.Column('signed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('declined_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('decline_reason', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['envelope_id'], ['envelopes.id'], name=op.f('fk_recipients_envelope_id_envelopes'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_recipients')),
        sa.UniqueConstraint('signing_token', name=op.f('uq_recipients_signing_token')),
    )
    op.create_index(op.f('ix_recipients_envelope_id'), 'recipients', ['envelope_id'], unique=False)

    # Fields table
    op.create_table(
        'fields',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.Enum('signature', 'initial', 'date_signed', 'text', 'checkbox', 'dropdown', 'radio', 'attachment', name='fieldtype', create_type=False), nullable=False),
        sa.Column('page', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('x', sa.Float(), nullable=False, server_default='0'),
        sa.Column('y', sa.Float(), nullable=False, server_default='0'),
        sa.Column('width', sa.Float(), nullable=False, server_default='100'),
        sa.Column('height', sa.Float(), nullable=False, server_default='40'),
        sa.Column('required', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('label', sa.String(length=256), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], name=op.f('fk_fields_document_id_documents'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_id'], ['recipients.id'], name=op.f('fk_fields_recipient_id_recipients'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_fields')),
    )
    op.create_index(op.f('ix_fields_document_id'), 'fields', ['document_id'], unique=False)
    op.create_index(op.f('ix_fields_recipient_id'), 'fields', ['recipient_id'], unique=False)

    # Audit events table
    op.create_table(
        'audit_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('envelope_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['envelope_id'], ['envelopes.id'], name=op.f('fk_audit_events_envelope_id_envelopes'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_id'], ['recipients.id'], name=op.f('fk_audit_events_recipient_id_recipients'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_events')),
    )
    op.create_index(op.f('ix_audit_events_envelope_id'), 'audit_events', ['envelope_id'], unique=False)

    # Templates table
    op.create_table(
        'templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('fields_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('roles', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('document_ids', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_templates_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_templates')),
    )
    op.create_index(op.f('ix_templates_user_id'), 'templates', ['user_id'], unique=False)

    # Contacts table
    op.create_table(
        'contacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('company', sa.String(length=256), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_contacts_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_contacts')),
    )
    op.create_index(op.f('ix_contacts_user_id'), 'contacts', ['user_id'], unique=False)
    op.create_index(op.f('ix_contacts_email'), 'contacts', ['email'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_contacts_email'), table_name='contacts')
    op.drop_index(op.f('ix_contacts_user_id'), table_name='contacts')
    op.drop_table('contacts')

    op.drop_index(op.f('ix_templates_user_id'), table_name='templates')
    op.drop_table('templates')

    op.drop_index(op.f('ix_audit_events_envelope_id'), table_name='audit_events')
    op.drop_table('audit_events')

    op.drop_index(op.f('ix_fields_recipient_id'), table_name='fields')
    op.drop_index(op.f('ix_fields_document_id'), table_name='fields')
    op.drop_table('fields')

    op.drop_index(op.f('ix_recipients_envelope_id'), table_name='recipients')
    op.drop_table('recipients')

    op.drop_index(op.f('ix_documents_envelope_id'), table_name='documents')
    op.drop_table('documents')

    op.drop_index(op.f('ix_envelopes_status'), table_name='envelopes')
    op.drop_index(op.f('ix_envelopes_user_id'), table_name='envelopes')
    op.drop_table('envelopes')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS fieldtype')
    op.execute('DROP TYPE IF EXISTS recipientstatus')
    op.execute('DROP TYPE IF EXISTS recipientrole')
    op.execute('DROP TYPE IF EXISTS envelopestatus')
