"""rename_expense_pending_to_submitted

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-05-19

Renames the expense approval queue status from pending back to submitted.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "e6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE expensestatus RENAME VALUE 'pending' TO 'submitted'")


def downgrade() -> None:
    op.execute("ALTER TYPE expensestatus RENAME VALUE 'submitted' TO 'pending'")
