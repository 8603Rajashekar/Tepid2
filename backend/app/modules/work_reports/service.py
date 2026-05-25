from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import check_permission, has_permission
from app.core.security import TokenUser
from app.models.user import User
from app.modules.audit_log.service import AuditLogService
from app.modules.work_reports.model import WorkReport
from app.modules.work_reports.schema import WorkReportCreate

# Which roles each viewer is allowed to see
VISIBLE_ROLES: dict[str, list[str] | None] = {
    "admin":               None,                         # all
    "super_admin":         None,                         # all
    "supervisor":          ["employee", "coordinator",   # employees + coordinators
                            "service_coordinator", "crm", "finance", "finance_officer"],
    "coordinator":         ["employee", "crm"],          # employees only
    "service_coordinator": ["employee", "crm"],
}


def _attach_user(report: WorkReport, full_name: str, role) -> WorkReport:
    """Attach joined user fields as dynamic attributes."""
    report.user_name = full_name  # type: ignore[attr-defined]
    report.user_role = str(role.value if hasattr(role, "value") else role)  # type: ignore[attr-defined]
    return report


class WorkReportService:

    # ------------------------------------------------------------------
    # SUBMIT
    # ------------------------------------------------------------------

    @staticmethod
    async def create(
        db: AsyncSession, data: WorkReportCreate, current_user: TokenUser,
    ) -> WorkReport:
        check_permission(current_user, "work_reports", "own")

        report = WorkReport(
            user_id=UUID(current_user.id),
            report_date=data.report_date,
            hours_logged=data.hours_logged,
            summary=data.summary,
            blockers=data.blockers,
            tomorrow_plan=data.tomorrow_plan,
            mood=data.mood,
            tasks=data.tasks or [],
            attachments=data.attachments or [],
        )
        db.add(report)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=409,
                detail=f"A report for {data.report_date} already exists",
            )
        await db.refresh(report)

        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="work_reports",
            action="report_submitted", record_id=str(report.id),
            after_data={"date": str(data.report_date), "hours": data.hours_logged},
        )
        await db.commit()
        return report

    # ------------------------------------------------------------------
    # MY REPORTS
    # ------------------------------------------------------------------

    @staticmethod
    async def get_my(db: AsyncSession, current_user: TokenUser) -> list[WorkReport]:
        check_permission(current_user, "work_reports", "own")
        result = await db.execute(
            select(WorkReport, User.full_name, User.role)
            .join(User, WorkReport.user_id == User.id)
            .where(WorkReport.user_id == UUID(current_user.id))
            .order_by(WorkReport.report_date.desc())
        )
        return [_attach_user(r, name, role) for r, name, role in result.all()]

    # ------------------------------------------------------------------
    # TEAM REPORTS  — filtered by role hierarchy
    # ------------------------------------------------------------------

    @staticmethod
    async def get_team(db: AsyncSession, current_user: TokenUser) -> list[WorkReport]:
        check_permission(current_user, "work_reports", "team")

        stmt = (
            select(WorkReport, User.full_name, User.role)
            .join(User, WorkReport.user_id == User.id)
            .order_by(WorkReport.report_date.desc())
        )

        # Apply role-based visibility filter
        allowed = VISIBLE_ROLES.get(current_user.role)
        if allowed is not None:                  # None means "see all"
            stmt = stmt.where(User.role.in_(allowed))

        result = await db.execute(stmt)
        return [_attach_user(r, name, role) for r, name, role in result.all()]

    # ------------------------------------------------------------------
    # GET ONE
    # ------------------------------------------------------------------

    @staticmethod
    async def get_one(
        db: AsyncSession, report_id: UUID, current_user: TokenUser,
    ) -> WorkReport:
        check_permission(current_user, "work_reports", "own")
        report = await db.get(WorkReport, report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        if (
            not has_permission(current_user, "work_reports", "team")
            and report.user_id != UUID(current_user.id)
        ):
            raise HTTPException(status_code=403, detail="Access denied")
        return report
