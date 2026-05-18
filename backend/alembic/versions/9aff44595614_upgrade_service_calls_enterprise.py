"""upgrade_service_calls_enterprise

Revision ID: 9aff44595614
Revises: 26b071487482
Create Date: 2026-05-18

Replaces the basic service_calls schema with the enterprise version:
  - Status enum: servicecallstatus → servicestatus  (adds new/pending_assignment/escalated)
  - Priority enum: servicepriority (critical/high/medium/low)
  - New columns: title, description, priority, created_by, assigned_at, sla fields
  - Removed columns: customer_name, customer_phone, issue_description
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = '9aff44595614'
down_revision: Union[str, Sequence[str], None] = '26b071487482'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # ── 1. Create new enum types ───────────────────────────────────────
    servicestatus = postgresql.ENUM(
        'new', 'pending_assignment', 'assigned',
        'in_progress', 'resolved', 'closed', 'escalated',
        name='servicestatus', create_type=False,
    )
    servicestatus.create(bind, checkfirst=True)

    servicepriority = postgresql.ENUM(
        'critical', 'high', 'medium', 'low',
        name='servicepriority', create_type=False,
    )
    servicepriority.create(bind, checkfirst=True)

    # ── 2. Add new columns (nullable first so existing rows are valid) ─
    op.add_column('service_calls', sa.Column('title',       sa.String(200), nullable=True))
    op.add_column('service_calls', sa.Column('description', sa.Text(),       nullable=True))
    op.add_column('service_calls', sa.Column('priority',
        postgresql.ENUM(name='servicepriority', create_type=False), nullable=True))
    op.add_column('service_calls', sa.Column('created_by',
        postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('service_calls', sa.Column('assigned_at',
        sa.DateTime(timezone=True), nullable=True))
    op.add_column('service_calls', sa.Column('response_sla_minutes',   sa.Integer(), nullable=True))
    op.add_column('service_calls', sa.Column('resolution_sla_minutes', sa.Integer(), nullable=True))

    # ── 3. Populate new columns from legacy data ───────────────────────
    # title / description from issue_description (if column exists)
    op.execute("""
        UPDATE service_calls
           SET title       = LEFT(COALESCE(issue_description, 'Service Call'), 200),
               description = COALESCE(issue_description, 'Migrated service call'),
               priority    = 'medium'::servicepriority
    """)

    # ── 4. Add a staging column with the new status enum ──────────────
    op.add_column('service_calls', sa.Column('status_new',
        postgresql.ENUM(name='servicestatus', create_type=False), nullable=True))

    op.execute("""
        UPDATE service_calls
           SET status_new = CASE status::text
               WHEN 'open'        THEN 'pending_assignment'::servicestatus
               WHEN 'assigned'    THEN 'assigned'::servicestatus
               WHEN 'in_progress' THEN 'in_progress'::servicestatus
               WHEN 'resolved'    THEN 'resolved'::servicestatus
               WHEN 'closed'      THEN 'closed'::servicestatus
               ELSE 'new'::servicestatus
           END
    """)

    # ── 5. Swap status columns ─────────────────────────────────────────
    op.drop_column('service_calls', 'status')
    op.alter_column('service_calls', 'status_new',
                    new_column_name='status', nullable=False)

    # ── 6. Enforce NOT NULL on migrated columns ────────────────────────
    op.alter_column('service_calls', 'title',       nullable=False)
    op.alter_column('service_calls', 'description', nullable=False)
    op.alter_column('service_calls', 'priority',    nullable=False)

    # ── 7. Drop legacy columns ─────────────────────────────────────────
    op.drop_column('service_calls', 'customer_name')
    op.drop_column('service_calls', 'customer_phone')
    op.drop_column('service_calls', 'issue_description')

    # ── 8. Drop old enum type ──────────────────────────────────────────
    op.execute('DROP TYPE IF EXISTS servicecallstatus')


def downgrade() -> None:
    bind = op.get_bind()

    # Recreate old enum
    old_enum = postgresql.ENUM(
        'open', 'assigned', 'in_progress', 'resolved', 'closed',
        name='servicecallstatus', create_type=False,
    )
    old_enum.create(bind, checkfirst=True)

    # Add back legacy columns
    op.add_column('service_calls', sa.Column('customer_name',  sa.String(200), nullable=True))
    op.add_column('service_calls', sa.Column('customer_phone', sa.String(20),  nullable=True))
    op.add_column('service_calls', sa.Column('issue_description', sa.Text(),   nullable=True))

    # Copy description back
    op.execute("UPDATE service_calls SET issue_description = description")

    # Swap status back
    op.add_column('service_calls', sa.Column('status_old',
        postgresql.ENUM(name='servicecallstatus', create_type=False), nullable=True))
    op.execute("""
        UPDATE service_calls
           SET status_old = CASE status::text
               WHEN 'new'                THEN 'open'::servicecallstatus
               WHEN 'pending_assignment' THEN 'open'::servicecallstatus
               WHEN 'escalated'          THEN 'open'::servicecallstatus
               WHEN 'assigned'    THEN 'assigned'::servicecallstatus
               WHEN 'in_progress' THEN 'in_progress'::servicecallstatus
               WHEN 'resolved'    THEN 'resolved'::servicecallstatus
               WHEN 'closed'      THEN 'closed'::servicecallstatus
               ELSE 'open'::servicecallstatus
           END
    """)
    op.drop_column('service_calls', 'status')
    op.alter_column('service_calls', 'status_old', new_column_name='status', nullable=False)

    # Drop new columns
    for col in ('title', 'description', 'priority', 'created_by', 'assigned_at',
                'response_sla_minutes', 'resolution_sla_minutes'):
        op.drop_column('service_calls', col)

    op.execute('DROP TYPE IF EXISTS servicestatus')
    op.execute('DROP TYPE IF EXISTS servicepriority')
