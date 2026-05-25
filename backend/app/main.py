from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.modules.analytics.router import router as analytics_router
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
from app.modules.tasks.router import router as tasks_router
from app.modules.tracking.router import router as tracking_router
from app.modules.users.router import router as users_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url=f"{settings.API_V1_PREFIX}/docs",
        redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=settings.CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
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
    app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)
    app.include_router(service_calls_router, prefix=settings.API_V1_PREFIX)
    app.include_router(expenses_router, prefix=settings.API_V1_PREFIX)
    app.include_router(documents_router, prefix=settings.API_V1_PREFIX)
    app.include_router(work_reports_router, prefix=settings.API_V1_PREFIX)
    app.include_router(crm_router, prefix=settings.API_V1_PREFIX)
    app.include_router(notifications_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()
