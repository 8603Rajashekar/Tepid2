"""create_approval_logs

Revision ID: c3d4e5f6a7b2
Revises: b2c3d4e5f6a1
Create Date: 2026-05-19

Central approval engine:
  - approval_logs table with module enum, action enum, signature type enum
  - SHA-256 hash column for tamper detection
  - Covers: tasks, expenses, documents, service_calls
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'c3d4e5f6a7b2'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # Enum: which module owns the referenced record
    approval_module = postgresql.ENUM(
        'task', 'expense', 'document', 'service_call',
        name='approvalmodule', create_type=False,
    )
    approval_module.create(bind, checkfirst=True)

    # Enum: what the actor did
    approval_action = postgresql.ENUM(
        'approved', 'rejected', 'escalated',
        name='approvalaction', create_type=False,
    )
    approval_action.create(bind, checkfirst=True)

    # Enum: how the actor signed
    signature_type = postgresql.ENUM(
        'drawn', 'typed', 'otp',
        name='signaturetype', create_type=False,
    )
    signature_type.create(bind, checkfirst=True)

    op.create_table(
        'approval_logs',
        sa.Column('id',               postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('module',           postgresql.ENUM(name='approvalmodule',  create_type=False), nullable=False),
        sa.Column('ref_id',           postgresql.UUID(as_uuid=True),          nullable=False),
        sa.Column('actor_id',         postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id'), nullable=False),
        sa.Column('action',           postgresql.ENUM(name='approvalaction',  create_type=False), nullable=False),
        sa.Column('signature_type',   postgresql.ENUM(name='signaturetype',   create_type=False), nullable=False),
        sa.Column('signature_data',   sa.Text(),        nullable=False),
        sa.Column('rejection_reason', sa.Text(),        nullable=True),
        sa.Column('ip_address',       sa.String(45),    nullable=True),
        sa.Column('user_agent',       sa.String(500),   nullable=True),
        sa.Column('timestamp',        sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column('hash',             sa.String(64),    nullable=False),
    )

    op.create_index('ix_approval_logs_ref_id',   'approval_logs', ['ref_id'])
    op.create_index('ix_approval_logs_actor_id', 'approval_logs', ['actor_id'])
    op.create_index('ix_approval_logs_module',   'approval_logs', ['module'])


def downgrade() -> None:
    op.drop_index('ix_approval_logs_module',   table_name='approval_logs')
    op.drop_index('ix_approval_logs_actor_id', table_name='approval_logs')
    op.drop_index('ix_approval_logs_ref_id',   table_name='approval_logs')
    op.drop_table('approval_logs')
    op.execute('DROP TYPE IF EXISTS signaturetype')
    op.execute('DROP TYPE IF EXISTS approvalaction')
    op.execute('DROP TYPE IF EXISTS approvalmodule')
