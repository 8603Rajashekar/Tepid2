from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.service_calls.schema import (
    ServiceCallCreate,
    ServiceCallAssign,
    ServiceCallUpdateStatus,
    ServiceCallClose,
    ServiceCallResponse,
)
from app.modules.service_calls.service import ServiceCallService

router = APIRouter(prefix="/service-calls", tags=["Service Calls"])


@router.post("/", response_model=ServiceCallResponse)
async def create_call(
    data: ServiceCallCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.create(db, data, current_user)


@router.patch("/{call_id}/assign", response_model=ServiceCallResponse)
async def assign_call(
    call_id: UUID,
    data: ServiceCallAssign,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.assign(db, call_id, data.assigned_to, current_user)


@router.patch("/{call_id}/status", response_model=ServiceCallResponse)
async def update_status(
    call_id: UUID,
    data: ServiceCallUpdateStatus,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.update_status(db, call_id, data.status, current_user)


@router.post("/{call_id}/close", response_model=ServiceCallResponse)
async def close_call(
    call_id: UUID,
    data: ServiceCallClose,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.close(db, call_id, data.resolution_notes, current_user)
