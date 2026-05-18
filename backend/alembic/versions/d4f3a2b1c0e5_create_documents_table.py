"""create_documents_table

Revision ID: d4f3a2b1c0e5
Revises: 9aff44595614
Create Date: 2026-05-18

Creates the documents table with status workflow:
  uploaded → review → signing → approved / rejected → archived
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'd4f3a2b1c0e5'
down_revision: Union[str, Sequence[str], None] = '9aff44595614'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    documentstatus = postgresql.ENUM(
        'uploaded', 'review', 'signing', 'approved', 'rejected', 'archived',
        name='documentstatus', create_type=False,
    )
    documentstatus.create(bind, checkfirst=True)

    op.create_table(
        'documents',
        sa.Column('id',               postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name',             sa.String(500),  nullable=False),
        sa.Column('file_url',         sa.String(2000), nullable=False),
        sa.Column('uploaded_by',      postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status',
                  postgresql.ENUM(name='documentstatus', create_type=False),
                  nullable=False, server_default='uploaded'),
        sa.Column('approved_by',      postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id'), nullable=True),
        sa.Column('approved_at',      sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at',       sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    op.create_index('ix_documents_uploaded_by', 'documents', ['uploaded_by'])
    op.create_index('ix_documents_status',      'documents', ['status'])


def downgrade() -> None:
    op.drop_index('ix_documents_status',      table_name='documents')
    op.drop_index('ix_documents_uploaded_by', table_name='documents')
    op.drop_table('documents')
    op.execute('DROP TYPE IF EXISTS documentstatus')
