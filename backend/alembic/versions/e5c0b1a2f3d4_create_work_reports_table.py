"""create_work_reports_table

Revision ID: e5c0b1a2f3d4
Revises: d4f3a2b1c0e5
Create Date: 2026-05-18

Creates the work_reports table:
  - One report per employee per day (unique constraint user_id + report_date)
  - hours_logged capped at 12 in application layer
  - mood enum: great / good / neutral / struggling
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'e5c0b1a2f3d4'
down_revision: Union[str, Sequence[str], None] = 'd4f3a2b1c0e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    moodlevel = postgresql.ENUM(
        'great', 'good', 'neutral', 'struggling',
        name='moodlevel', create_type=False,
    )
    moodlevel.create(bind, checkfirst=True)

    op.create_table(
        'work_reports',
        sa.Column('id',            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id',       postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id'), nullable=False),
        sa.Column('report_date',   sa.Date(),   nullable=False),
        sa.Column('hours_logged',  sa.Float(),  nullable=False),
        sa.Column('summary',       sa.Text(),   nullable=False),
        sa.Column('blockers',      sa.Text(),   nullable=True),
        sa.Column('tomorrow_plan', sa.Text(),   nullable=True),
        sa.Column('mood',
                  postgresql.ENUM(name='moodlevel', create_type=False),
                  nullable=True),
        sa.Column('created_at',    sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'report_date', name='uq_work_report_user_date'),
    )

    op.create_index('ix_work_reports_user_id',     'work_reports', ['user_id'])
    op.create_index('ix_work_reports_report_date', 'work_reports', ['report_date'])


def downgrade() -> None:
    op.drop_index('ix_work_reports_report_date', table_name='work_reports')
    op.drop_index('ix_work_reports_user_id',     table_name='work_reports')
    op.drop_table('work_reports')
    op.execute('DROP TYPE IF EXISTS moodlevel')
