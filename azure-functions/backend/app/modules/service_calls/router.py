from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.service_calls.schema import (
    ServiceCallAssign,
    ServiceCallCreate,
    ServiceCallResolve,
    ServiceCallResponse,
)
from app.modules.service_calls.service import ServiceCallService

router = APIRouter(prefix="/service-calls", tags=["Service Calls"])


@router.get("/", response_model=list[ServiceCallResponse])
async def list_calls(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.get_all(db, current_user)


@router.get("/{call_id}", response_model=ServiceCallResponse)
async def get_call(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.get_one(db, call_id, current_user)


@router.post("/", response_model=ServiceCallResponse, status_code=201)
async def create_call(
    data: ServiceCallCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.create(db, data, current_user)


@router.post("/{call_id}/assign", response_model=ServiceCallResponse)
async def assign_call(
    call_id: UUID,
    data: ServiceCallAssign,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.assign(db, call_id, data, current_user)


@router.post("/{call_id}/start", response_model=ServiceCallResponse)
async def start_call(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.start(db, call_id, current_user)


@router.post("/{call_id}/resolve", response_model=ServiceCallResponse)
async def resolve_call(
    call_id: UUID,
    data: ServiceCallResolve,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.resolve(db, call_id, data, current_user)


@router.post("/{call_id}/close", response_model=ServiceCallResponse)
async def close_call(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.close(db, call_id, current_user)


@router.post("/{call_id}/escalate", response_model=ServiceCallResponse)
async def escalate_call(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ServiceCallService.escalate(db, call_id, current_user)
