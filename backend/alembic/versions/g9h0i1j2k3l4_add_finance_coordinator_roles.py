"""add_finance_coordinator_roles

Revision ID: g9h0i1j2k3l4
Revises: f7a8b9c0d1e2
Create Date: 2026-05-20

Adds finance and coordinator as first-class role values (replacing finance_officer
and service_coordinator). Also adds admin_approved to expensestatus for the
3-step approval flow: supervisor -> finance -> admin.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "g9h0i1j2k3l4"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Rebuild user_role enum with new values ─────────────────────
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.execute(
        "CREATE TYPE user_role_new AS ENUM "
        "('admin', 'supervisor', 'finance', 'coordinator', 'employee', "
        "'super_admin', 'service_coordinator', 'finance_officer')"
    )
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE user_role_new "
        "USING role::text::user_role_new"
    )
    op.execute("DROP TYPE user_role")
    op.execute("ALTER TYPE user_role_new RENAME TO user_role")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'employee'::user_role")

    # ── 2. Migrate existing users to new role names ───────────────────
    op.execute("UPDATE users SET role = 'admin'       WHERE role = 'super_admin'")
    op.execute("UPDATE users SET role = 'finance'     WHERE role = 'finance_officer'")
    op.execute("UPDATE users SET role = 'coordinator' WHERE role = 'service_coordinator'")

    # ── 3. Add admin_approved to expensestatus enum ───────────────────
    op.execute(
        "CREATE TYPE expensestatus_new AS ENUM "
        "('draft', 'submitted', 'supervisor_approved', 'finance_approved', "
        "'admin_approved', 'rejected', 'reimbursed')"
    )
    op.execute(
        "ALTER TABLE expenses ALTER COLUMN status TYPE expensestatus_new "
        "USING status::text::expensestatus_new"
    )
    op.execute("DROP TYPE expensestatus")
    op.execute("ALTER TYPE expensestatus_new RENAME TO expensestatus")


def downgrade() -> None:
    # Revert expensestatus
    op.execute(
        "CREATE TYPE expensestatus_old AS ENUM "
        "('draft', 'submitted', 'supervisor_approved', 'finance_approved', "
        "'rejected', 'reimbursed')"
    )
    op.execute(
        "UPDATE expenses SET status = 'finance_approved' WHERE status = 'admin_approved'"
    )
    op.execute(
        "ALTER TABLE expenses ALTER COLUMN status TYPE expensestatus_old "
        "USING status::text::expensestatus_old"
    )
    op.execute("DROP TYPE expensestatus")
    op.execute("ALTER TYPE expensestatus_old RENAME TO expensestatus")

    # Revert user roles
    op.execute("UPDATE users SET role = 'finance_officer'     WHERE role = 'finance'")
    op.execute("UPDATE users SET role = 'service_coordinator' WHERE role = 'coordinator'")

    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.execute(
        "CREATE TYPE user_role_old AS ENUM "
        "('super_admin', 'admin', 'supervisor', 'service_coordinator', 'finance_officer', 'employee')"
    )
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE user_role_old "
        "USING role::text::user_role_old"
    )
    op.execute("DROP TYPE user_role")
    op.execute("ALTER TYPE user_role_old RENAME TO user_role")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'employee'::user_role")
