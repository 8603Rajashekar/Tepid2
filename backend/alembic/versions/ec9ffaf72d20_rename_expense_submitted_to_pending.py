"""rename_expense_submitted_to_pending

Revision ID: ec9ffaf72d20
Revises: ce40054b0be5
Create Date: 2026-05-18 16:25:47.393569

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec9ffaf72d20'
down_revision: Union[str, Sequence[str], None] = 'ce40054b0be5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL 10+ supports in-place enum value rename
    op.execute("ALTER TYPE expensestatus RENAME VALUE 'submitted' TO 'pending'")


def downgrade() -> None:
    op.execute("ALTER TYPE expensestatus RENAME VALUE 'pending' TO 'submitted'")
