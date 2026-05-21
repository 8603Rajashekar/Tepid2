"""add_tasks_attachments_mood_to_work_reports

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-05-19

- Adds tasks (JSONB) — list of task IDs referenced in the report
- Adds attachments (JSONB) — list of attachment objects
- Extends moodlevel enum with workload values: light, normal, heavy, overloaded
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b2c3d4e5f6a1'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new mood values — IF NOT EXISTS avoids errors on re-run
    for val in ('light', 'normal', 'heavy', 'overloaded'):
        op.execute(f"ALTER TYPE moodlevel ADD VALUE IF NOT EXISTS '{val}'")

    op.add_column('work_reports', sa.Column('tasks',       postgresql.JSONB(), nullable=True))
    op.add_column('work_reports', sa.Column('attachments', postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('work_reports', 'attachments')
    op.drop_column('work_reports', 'tasks')
    # PostgreSQL has no "REMOVE VALUE" for enums — values are left in place on downgrade
