import os
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

from alembic import context

load_dotenv()

from app.core.config import settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

_db_url = os.getenv("SYNC_DATABASE_URL", "") or settings.sync_database_url
config.set_main_option("sqlalchemy.url", _db_url.replace("%", "%%"))

from app.db.base import Base
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.role import Role, UserRole  # noqa: F401
from app.models.user import User  # noqa: F401
from app.modules.tasks.model import Task  # noqa: F401
from app.modules.tracking.model import TaskLocation  # noqa: F401
from app.modules.service_calls.model import ServiceCall  # noqa: F401
from app.modules.expenses.model import Expense  # noqa: F401
from app.modules.documents.model import Document  # noqa: F401
from app.modules.work_reports.model import WorkReport  # noqa: F401
from app.modules.approvals.model import ApprovalLog  # noqa: F401
from app.modules.notifications.model import Notification  # noqa: F401
from app.modules.crm.model import CRMCall  # noqa: F401
from app.modules.auth.model import LoginOtp  # noqa: F401

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    from sqlalchemy import create_engine
    connectable = create_engine(_db_url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            transaction_per_migration=True,
        )
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
