"""add assigned_at to tasks

Revision ID: c9d8e7f6a5b4
Revises: f2a3b4c5d6e7
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa


revision = "c9d8e7f6a5b4"
down_revision = "f2a3b4c5d6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tasks", "assigned_at")

