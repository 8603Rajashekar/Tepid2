from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import check_permission, has_permission
from app.core.security import TokenUser
from app.modules.audit_log.service import AuditLogService
from app.modules.work_reports.model import WorkReport
from app.modules.work_reports.schema import WorkReportCreate


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
            select(WorkReport)
            .where(WorkReport.user_id == UUID(current_user.id))
            .order_by(WorkReport.report_date.desc())
        )
        return list(result.scalars().all())

    # ------------------------------------------------------------------
    # TEAM REPORTS  (supervisor / admin / super_admin)
    # ------------------------------------------------------------------

    @staticmethod
    async def get_team(db: AsyncSession, current_user: TokenUser) -> list[WorkReport]:
        check_permission(current_user, "work_reports", "team")
        result = await db.execute(
            select(WorkReport).order_by(WorkReport.report_date.desc())
        )
        return list(result.scalars().all())

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
