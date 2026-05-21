"""add_folder_and_version_to_documents

Revision ID: 2e3fafda7ad8
Revises: g9h0i1j2k3l4
Create Date: 2026-05-20 15:16:55.404419

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '2e3fafda7ad8'
down_revision: Union[str, Sequence[str], None] = 'g9h0i1j2k3l4'
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
