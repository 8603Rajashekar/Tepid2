"""make_approval_signature_data_nullable

Revision ID: d5e6f7a8b9c0
Revises: c3d4e5f6a7b2
Create Date: 2026-05-19

Allows rejection/escalation approval logs to omit signature_data while keeping
service-level validation for approved actions.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "approval_logs",
        "signature_data",
        existing_type=sa.Text(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "approval_logs",
        "signature_data",
        existing_type=sa.Text(),
        nullable=False,
    )
