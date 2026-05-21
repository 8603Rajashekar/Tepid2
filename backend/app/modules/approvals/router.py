from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.approvals.schema import ApprovalCreate, ApprovalResponse
from app.modules.approvals.service import ApprovalService
from app.modules.approvals.model import ApprovalModule

router = APIRouter(prefix="/approvals", tags=["Approvals"])


@router.post("/", response_model=ApprovalResponse, status_code=201)
async def submit_approval(
    data: ApprovalCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """
    Unified approval endpoint.
    Updates the referenced module's record status AND writes a tamper-proof approval_log.
    """
    return await ApprovalService.create(db, data, current_user, request)


@router.get("/{ref_id}/history", response_model=list[ApprovalResponse])
async def approval_history(
    ref_id: UUID,
    module: ApprovalModule | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Return all approval events for a given record (any module)."""
    return await ApprovalService.get_history(db, ref_id, current_user, module)


@router.get("/{ref_id}/verify/{log_id}")
async def verify_approval(
    ref_id: UUID,
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Tamper-check: verify the SHA-256 hash of a specific approval log entry."""
    from app.modules.approvals.model import ApprovalLog
    log = await db.get(ApprovalLog, log_id)
    if not log or log.ref_id != ref_id:
        from fastapi import HTTPException
        raise HTTPException(404, "Approval log not found")
    intact = ApprovalService.verify_hash(log)
    return {"intact": intact, "log_id": str(log_id)}
