"""add task_type to tasks

Revision ID: d1e2f3a4b5c6
Revises: c9d8e7f6a5b4
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa


revision = "d1e2f3a4b5c6"
down_revision = "c9d8e7f6a5b4"
branch_labels = None
depends_on = None


task_type_enum = sa.Enum(
    "service",
    "issue",
    "inspection",
    "installation",
    "other",
    name="tasktype",
)


def upgrade() -> None:
    bind = op.get_bind()
    task_type_enum.create(bind, checkfirst=True)
    op.add_column(
        "tasks",
        sa.Column(
            "task_type",
            task_type_enum,
            nullable=False,
            server_default="other",
        ),
    )
    op.alter_column("tasks", "task_type", server_default=None)


def downgrade() -> None:
    op.drop_column("tasks", "task_type")
    bind = op.get_bind()
    task_type_enum.drop(bind, checkfirst=True)

