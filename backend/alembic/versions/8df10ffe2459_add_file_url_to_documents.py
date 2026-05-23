"""add_file_url_to_documents

Revision ID: 8df10ffe2459
Revises: 2e3fafda7ad8
Create Date: 2026-05-20 15:20:37.134562

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8df10ffe2459'
down_revision: Union[str, Sequence[str], None] = '2e3fafda7ad8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    col_exists = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name='documents' AND column_name='file_url'"
    )).scalar()
    if not col_exists:
        op.add_column(
            'documents',
            sa.Column('file_url', sa.String(2000), nullable=False, server_default=''),
        )
        op.alter_column('documents', 'file_url', server_default=None)


def downgrade() -> None:
    op.drop_column('documents', 'file_url')
