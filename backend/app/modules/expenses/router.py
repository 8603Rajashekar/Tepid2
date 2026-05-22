import shutil
import uuid as _uuid
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.approvals.schema import ApprovalCreate
from app.modules.expenses.schema import (
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
)
from app.modules.expenses.service import ExpenseService

UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv",
                      ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif",
                      ".zip", ".txt"}

router = APIRouter(prefix="/expenses", tags=["Expenses"])


# ── Employee endpoints ────────────────────────────────────────────────

@router.post("/", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Employee creates an expense in draft state."""
    return await ExpenseService.create(db, data, current_user)


@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Edit a draft expense before submitting."""
    return await ExpenseService.update(db, expense_id, data, current_user)


@router.post("/{expense_id}/submit", response_model=ExpenseResponse)
async def submit_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Employee submits draft -> submitted (enters approval queue)."""
    return await ExpenseService.submit(db, expense_id, current_user)


# ── Supervisor endpoint ───────────────────────────────────────────────

@router.post("/{expense_id}/approve", response_model=ExpenseResponse)
async def supervisor_approve(
    expense_id: UUID,
    data: ApprovalCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Supervisor approves a submitted expense.
    Amount ≤ 10,000 → finance_approved (auto).
    Amount > 10,000 → supervisor_approved (awaits Finance)."""
    return await ExpenseService.supervisor_approve(db, expense_id, data, current_user, request)


# ── Finance endpoints ─────────────────────────────────────────────────

@router.post("/{expense_id}/admin-approve", response_model=ExpenseResponse)
async def admin_approve(
    expense_id: UUID,
    data: ApprovalCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Admin gives final approval after finance validation."""
    return await ExpenseService.admin_approve(db, expense_id, data, current_user, request)


@router.post("/{expense_id}/finance", response_model=ExpenseResponse)
async def finance_approve(
    expense_id: UUID,
    data: ApprovalCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Finance gives final approval for large expenses (> 10,000)."""
    return await ExpenseService.finance_approve(db, expense_id, data, current_user, request)


@router.post("/{expense_id}/reimburse", response_model=ExpenseResponse)
async def reimburse_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Finance marks a finance_approved expense as reimbursed."""
    return await ExpenseService.reimburse(db, expense_id, current_user)


# ── Shared reject endpoint (supervisor or finance) ────────────────────

@router.post("/{expense_id}/reject", response_model=ExpenseResponse)
async def reject_expense(
    expense_id: UUID,
    data: ApprovalCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Reject at any stage (submitted or supervisor_approved). Requires a reason."""
    return await ExpenseService.reject(db, expense_id, data, current_user, request)


# ── Read endpoints ────────────────────────────────────────────────────

@router.get("/", response_model=list[ExpenseResponse])
async def list_expenses(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Employees see own; supervisor/finance/admin see all."""
    return await ExpenseService.get_all(db, current_user)


@router.get("/my", response_model=list[ExpenseResponse])
async def my_expenses(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ExpenseService.get_my(db, current_user)


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await ExpenseService.get_one(db, expense_id, current_user)


@router.post("/{expense_id}/receipt", response_model=ExpenseResponse)
async def upload_receipt(
    expense_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Attach a supporting document to an expense (required when amount > ₹1,000)."""
    from fastapi import HTTPException
    suffix = Path(file.filename or "file").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{suffix}' not allowed")

    file_id = str(_uuid.uuid4())
    safe_name = f"receipt_{file_id}{suffix}"
    dest = UPLOAD_DIR / safe_name
    with dest.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)

    receipt_url = f"/uploads/{safe_name}"
    return await ExpenseService.attach_receipt(db, expense_id, receipt_url, current_user)
