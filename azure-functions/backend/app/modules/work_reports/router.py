from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.work_reports.schema import WorkReportCreate, WorkReportResponse
from app.modules.work_reports.service import WorkReportService

router = APIRouter(prefix="/reports", tags=["Work Reports"])


@router.post("/", response_model=WorkReportResponse, status_code=201)
async def submit_report(
    data: WorkReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await WorkReportService.create(db, data, current_user)


@router.get("/me", response_model=list[WorkReportResponse])
async def my_reports(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await WorkReportService.get_my(db, current_user)


@router.get("/my", response_model=list[WorkReportResponse])
async def my_reports_alias(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await WorkReportService.get_my(db, current_user)


@router.get("/team", response_model=list[WorkReportResponse])
async def team_reports(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await WorkReportService.get_team(db, current_user)


@router.get("/{report_id}", response_model=WorkReportResponse)
async def get_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await WorkReportService.get_one(db, report_id, current_user)
