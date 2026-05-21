"""add_folder_and_version_to_documents

Revision ID: a1b2c3d4e5f6
Revises: d4f3a2b1c0e5
Create Date: 2026-05-19

Adds folder_id (nullable UUID) and version (integer, default 1) to the documents table.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'documents',
        sa.Column('folder_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        'documents',
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
    )


def downgrade() -> None:
    op.drop_column('documents', 'version')
    op.drop_column('documents', 'folder_id')
