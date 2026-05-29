import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.modules.analytics.router import router as analytics_router
from app.modules.audit_log.router import router as audit_log_router
from app.modules.crm.router import router as crm_router
from app.modules.analytics.ws import router as ws_router
from app.modules.approvals.router import router as approvals_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.documents.router import router as documents_router
from app.modules.expenses.router import router as expenses_router
from app.modules.notifications.router import router as notifications_router
from app.modules.service_calls.router import router as service_calls_router
from app.modules.work_reports.router import router as work_reports_router
from app.modules.auth.router import router as auth_router
from app.modules.health.router import router as health_router
from app.modules.profile.router import router as profile_router
from app.modules.search.router import router as search_router
from app.modules.tasks.router import router as tasks_router
from app.modules.tracking.router import router as tracking_router
from app.modules.users.router import router as users_router


async def _crm_followup_reminder_loop() -> None:
    """Background task: every 6 hours notify agents about overdue CRM follow-ups."""
    from datetime import datetime, timezone
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.modules.crm.model import CRMCall, CallStatus
    from app.modules.notifications.service import create_notification

    _OPEN = {CallStatus.open, CallStatus.in_progress}
    INTERVAL = 6 * 3600  # 6 hours

    while True:
        try:
            now = datetime.now(timezone.utc)
            async with AsyncSessionLocal() as db:
                rows = (await db.execute(
                    select(CRMCall)
                    .where(CRMCall.follow_up_date < now)
                    .where(CRMCall.status.in_([s.value for s in _OPEN]))
                    .where(CRMCall.assigned_to.isnot(None))
                )).scalars().all()

                for call in rows:
                    msg = (
                        f"⏰ Follow-up overdue: '{call.customer_name}' "
                        f"({call.company_name or call.phone}) — scheduled "
                        f"{call.follow_up_date.strftime('%d %b %H:%M')}"
                    )
                    await create_notification(call.assigned_to, msg)
        except Exception as exc:
            print(f"[CRM follow-up reminder] error: {exc}")

        await asyncio.sleep(INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background CRM follow-up reminder
    task = asyncio.create_task(_crm_followup_reminder_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url=f"{settings.API_V1_PREFIX}/docs",
        redoc_url=f"{settings.API_V1_PREFIX}/redoc",
        lifespan=lifespan,
    )

    _allow_origins = settings.CORS_ORIGINS
    _allow_regex = settings.CORS_ORIGIN_REGEX
    _credentials = True

    # allow_credentials=True is incompatible with allow_origins=["*"]
    if "*" in _allow_origins:
        _allow_origins = []
        _allow_regex = _allow_regex or r"https?://(localhost|127\.0\.0\.1)(:\d+)?"

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allow_origins,
        allow_origin_regex=_allow_regex,
        allow_credentials=_credentials,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    )

    register_exception_handlers(app)
    app.include_router(ws_router)   # no prefix — WebSocket at /ws/dashboard
    app.include_router(health_router, prefix=settings.API_V1_PREFIX)
    app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
    app.include_router(users_router, prefix=settings.API_V1_PREFIX)
    app.include_router(tasks_router, prefix=settings.API_V1_PREFIX)
    app.include_router(tracking_router, prefix=settings.API_V1_PREFIX)
    app.include_router(analytics_router, prefix=settings.API_V1_PREFIX)
    app.include_router(approvals_router, prefix=settings.API_V1_PREFIX)
    app.include_router(audit_log_router, prefix=settings.API_V1_PREFIX)
    app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)
    app.include_router(service_calls_router, prefix=settings.API_V1_PREFIX)
    app.include_router(expenses_router, prefix=settings.API_V1_PREFIX)
    app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
    app.include_router(work_reports_router, prefix=settings.API_V1_PREFIX)
    app.include_router(crm_router, prefix=settings.API_V1_PREFIX)
    app.include_router(notifications_router, prefix=settings.API_V1_PREFIX)
    app.include_router(profile_router, prefix=settings.API_V1_PREFIX)
    app.include_router(search_router, prefix=settings.API_V1_PREFIX)

    # ── DB verification endpoints (registered on every app instance) ─────────────
    from sqlalchemy import text, select, func
    from app.db.session import engine
    from app.models.user import User

    @app.get("/db-test", tags=["Debug"])
    async def db_test():
        try:
            async with engine.connect() as conn:
                if engine.dialect.name == "mssql":
                    result = await conn.execute(text("SELECT SYSUTCDATETIME() AS ts"))
                else:
                    result = await conn.execute(text("SELECT NOW() AT TIME ZONE 'UTC' AS ts"))
                row = result.fetchone()
            host = engine.url.host or "unknown"
            return {
                "status": f"{engine.dialect.name.upper()} connected",
                "db_host": host,
                "db_time_utc": str(row.ts),
            }
        except Exception as exc:
            return {"status": "error", "detail": str(exc), "type": type(exc).__name__}

    @app.get("/test-db", tags=["Debug"])
    async def test_db():
        from app.db.session import AsyncSessionLocal
        from app.modules.tasks.model import Task
        from app.modules.expenses.model import Expense
        try:
            async with AsyncSessionLocal() as session:
                user_count    = await session.scalar(select(func.count()).select_from(User))
                task_count    = await session.scalar(select(func.count()).select_from(Task))
                expense_count = await session.scalar(select(func.count()).select_from(Expense))
                rows = await session.execute(
                    select(User.email, User.role).order_by(User.created_at.asc()).limit(10)
                )
                user_list = [{"email": r.email, "role": r.role.value} for r in rows]
            return {
                "counts": {"users": user_count, "tasks": task_count, "expenses": expense_count},
                "users_sample": user_list,
            }
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    return app


app = create_app()
