"""add_role_to_users

Revision ID: f1a2b3c4d5e6
Revises: e5c0b1a2f3d4
Create Date: 2026-05-19

Adds a direct role column to the users table (replaces the junction-table lookup).
Backfills existing rows from the user_roles junction table.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e5c0b1a2f3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

USER_ROLE_ENUM = postgresql.ENUM(
    "super_admin",
    "admin",
    "supervisor",
    "service_coordinator",
    "finance_officer",
    "employee",
    name="user_role",
)


def upgrade() -> None:
    USER_ROLE_ENUM.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.Enum(
                "super_admin", "admin", "supervisor",
                "service_coordinator", "finance_officer", "employee",
                name="user_role",
            ),
            nullable=True,
        ),
    )

    # Backfill from junction table — map old role names to new enum values
    op.execute("""
        UPDATE users u
        SET role = (
            SELECT CASE r.name
                WHEN 'super_admin'  THEN 'super_admin'::user_role
                WHEN 'admin'        THEN 'admin'::user_role
                WHEN 'supervisor'   THEN 'supervisor'::user_role
                WHEN 'coordinator'  THEN 'service_coordinator'::user_role
                WHEN 'finance'      THEN 'finance_officer'::user_role
                WHEN 'employee'     THEN 'employee'::user_role
                ELSE 'employee'::user_role
            END
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = u.id
            LIMIT 1
        )
        WHERE role IS NULL
    """)

    # Default anything still NULL to employee
    op.execute("UPDATE users SET role = 'employee'::user_role WHERE role IS NULL")

    op.alter_column("users", "role", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "role")
    USER_ROLE_ENUM.drop(op.get_bind(), checkfirst=True)
