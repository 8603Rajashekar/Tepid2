"""add started_at and time_spent_minutes to tasks (merges crm branch)

Revision ID: f2a3b4c5d6e7
Revises: 8df10ffe2459, e1f2a3b4c5d6
Create Date: 2026-05-21

Merge migration: brings the crm branch (e1f2a3b4c5d6) into the main chain
and adds workflow timing columns to the tasks table.
"""
from alembic import op
import sqlalchemy as sa

revision = 'f2a3b4c5d6e7'
down_revision = ('8df10ffe2459', 'e1f2a3b4c5d6')
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "tasks",
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "tasks",
        sa.Column("time_spent_minutes", sa.Integer(), nullable=True),
    )


def downgrade():
    op.drop_column("tasks", "time_spent_minutes")
    op.drop_column("tasks", "started_at")
