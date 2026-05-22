"""create crm_calls table

Revision ID: e1f2a3b4c5d6
Revises:
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM, UUID

revision = 'e1f2a3b4c5d6'
down_revision = None
branch_labels = ('crm',)
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    call_type = ENUM('service', 'issue', 'enquiry', 'order', name='calltype')
    call_status = ENUM('open', 'in_progress', 'resolved', 'closed', name='callstatus')
    call_priority = ENUM('low', 'medium', 'high', 'urgent', name='callpriority')

    call_type.create(bind, checkfirst=True)
    call_status.create(bind, checkfirst=True)
    call_priority.create(bind, checkfirst=True)

    if 'crm_calls' in inspector.get_table_names():
        return

    op.create_table(
        'crm_calls',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('call_type',  ENUM('service','issue','enquiry','order', name='calltype', create_type=False),  nullable=False),
        sa.Column('status',     ENUM('open','in_progress','resolved','closed', name='callstatus', create_type=False),   nullable=False, server_default='open'),
        sa.Column('priority',   ENUM('low','medium','high','urgent', name='callpriority', create_type=False), nullable=False, server_default='medium'),
        sa.Column('customer_name', sa.String(200), nullable=False),
        sa.Column('phone',         sa.String(20),  nullable=False),
        sa.Column('location',      sa.String(300), nullable=True),
        sa.Column('description',   sa.Text,        nullable=True),
        sa.Column('equipment_name',       sa.String(200),   nullable=True),
        sa.Column('urgency',              sa.String(100),   nullable=True),
        sa.Column('quantity',             sa.Integer,       nullable=True),
        sa.Column('amount',               sa.Numeric(12, 2),nullable=True),
        sa.Column('special_requirements', sa.Text,          nullable=True),
        sa.Column('question',             sa.Text,          nullable=True),
        sa.Column('response_given',       sa.Text,          nullable=True),
        sa.Column('resolution_notes',     sa.Text,          nullable=True),
        sa.Column('resolved_at',     sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at',       sa.DateTime(timezone=True), nullable=True),
        sa.Column('follow_up_date',  sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by',  UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('assigned_to', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_crm_calls_call_type', 'crm_calls', ['call_type'])
    op.create_index('ix_crm_calls_status',    'crm_calls', ['status'])


def downgrade() -> None:
    op.drop_table('crm_calls')
    op.execute("DROP TYPE IF EXISTS calltype")
    op.execute("DROP TYPE IF EXISTS callstatus")
    op.execute("DROP TYPE IF EXISTS callpriority")
