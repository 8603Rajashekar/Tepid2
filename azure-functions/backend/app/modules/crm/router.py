from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.crm.model import CallType
from app.modules.crm.schema import CRMCallCreate, CRMCallResponse, CRMCallUpdate
from app.modules.crm.service import CRMService

router = APIRouter(prefix="/crm", tags=["CRM"])


@router.post("/", response_model=CRMCallResponse, status_code=201)
async def create_call(
    data: CRMCallCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await CRMService.create(db, data, current_user)


@router.get("/", response_model=list[CRMCallResponse])
async def list_calls(
    call_type: Optional[CallType] = None,
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    return await CRMService.get_all(db, call_type=call_type)


@router.get("/follow-ups", response_model=list[CRMCallResponse])
async def get_followups(
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    return await CRMService.get_followups(db)


@router.get("/{call_id}", response_model=CRMCallResponse)
async def get_call(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    return await CRMService.get_one(db, call_id)


@router.patch("/{call_id}", response_model=CRMCallResponse)
async def update_call(
    call_id: UUID,
    data: CRMCallUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await CRMService.update(db, call_id, data, current_user)


@router.delete("/{call_id}", status_code=204)
async def delete_call(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: TokenUser = Depends(get_current_user),
):
    await CRMService.delete(db, call_id)
