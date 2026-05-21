"""remove_viewer_role

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-05-19

Removes the viewer role from users and rebuilds the user_role enum without it.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "e6f7a8b9c0d1"
down_revision: Union[str, Sequence[str], None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM user_roles
        WHERE user_id IN (SELECT id FROM users WHERE role::text = 'viewer')
           OR role_id IN (SELECT id FROM roles WHERE name = 'viewer')
        """
    )
    op.execute("DELETE FROM users WHERE role::text = 'viewer'")
    op.execute("DELETE FROM roles WHERE name = 'viewer'")
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.execute(
        "CREATE TYPE user_role_new AS ENUM "
        "('super_admin', 'admin', 'supervisor', 'service_coordinator', 'finance_officer', 'employee')"
    )
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE user_role_new "
        "USING role::text::user_role_new"
    )
    op.execute("DROP TYPE user_role")
    op.execute("ALTER TYPE user_role_new RENAME TO user_role")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'employee'::user_role")


def downgrade() -> None:
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.execute(
        "CREATE TYPE user_role_old AS ENUM "
        "('super_admin', 'admin', 'supervisor', 'service_coordinator', 'finance_officer', 'employee', 'viewer')"
    )
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE user_role_old "
        "USING role::text::user_role_old"
    )
    op.execute("DROP TYPE user_role")
    op.execute("ALTER TYPE user_role_old RENAME TO user_role")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'employee'::user_role")
