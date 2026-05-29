import uuid as _uuid
from decimal import Decimal
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
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

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".heic",
    ".heif",
    ".bmp",
    ".tif",
    ".tiff",
    ".rtf",
    ".odt",
    ".ods",
    ".odp",
    ".ppt",
    ".pptx",
    ".zip",
    ".txt",
}

BLOB_CONTAINER = "expense-proofs"

router = APIRouter(prefix="/expenses", tags=["Expenses"])


async def _store_receipt_file(file: UploadFile) -> str:
    """Store an expense proof file and return the saved URL/path."""
    import base64
    import hashlib
    import hmac
    from datetime import UTC, datetime

    import httpx

    suffix = Path(file.filename or "file").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"File type '{suffix or 'unknown'}' not allowed. Allowed proof types: {allowed}",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded proof file is empty")

    blob_name = f"receipt_{_uuid.uuid4()}{suffix}"
    conn_str = getattr(settings, "AZURE_STORAGE_CONNECTION_STRING", None)
    if not conn_str:
        uploads_dir = Path("uploads") / "expense_receipts"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        target = uploads_dir / blob_name
        target.write_bytes(data)
        return f"/uploads/expense_receipts/{blob_name}"

    parts = dict(p.split("=", 1) for p in conn_str.split(";") if "=" in p)
    account = parts.get("AccountName", "")
    key_b64 = parts.get("AccountKey", "")
    content_type = file.content_type or "application/octet-stream"
    content_length = str(len(data))
    url = f"https://{account}.blob.core.windows.net/{BLOB_CONTAINER}/{blob_name}"

    date_str = datetime.now(UTC).strftime("%a, %d %b %Y %H:%M:%S GMT")
    string_to_sign = (
        f"PUT\n\n\n{content_length}\n\n{content_type}\n\n\n\n\n\n\n"
        f"x-ms-blob-type:BlockBlob\nx-ms-date:{date_str}\nx-ms-version:2020-08-04\n"
        f"/{account}/{BLOB_CONTAINER}/{blob_name}"
    )
    sig = base64.b64encode(
        hmac.new(base64.b64decode(key_b64), string_to_sign.encode("utf-8"), hashlib.sha256).digest()
    ).decode()

    headers = {
        "x-ms-date": date_str,
        "x-ms-version": "2020-08-04",
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": content_type,
        "Content-Length": content_length,
        "Authorization": f"SharedKey {account}:{sig}",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.put(url, content=data, headers=headers, timeout=60)
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Blob upload failed: {resp.text[:200]}")

    return url


# ── Employee endpoints ────────────────────────────────────────────────

@router.post("/", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Employee creates an expense in draft state."""
    return await ExpenseService.create(db, data, current_user)


@router.post("/with-receipt", response_model=ExpenseResponse, status_code=201)
async def create_expense_with_receipt(
    title: str = Form(...),
    amount: Decimal = Form(...),
    category: str = Form(...),
    description: str | None = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Create an expense and attach proof in one atomic user action."""
    data = ExpenseCreate(
        title=title,
        description=description,
        amount=amount,
        category=category,
        receipt_url="pending-upload",
    )
    receipt_url = await _store_receipt_file(file)
    data = data.model_copy(update={"receipt_url": receipt_url})
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
    """DEPRECATED — supervisor approval is no longer part of the expense flow.
    The flow is now: Employee → Finance → Admin.
    Finance uses /finance, Admin uses /admin-approve."""
    raise HTTPException(
        status_code=403,
        detail=(
            "Supervisor approval has been removed from the expense workflow. "
            "The approval chain is now: Finance validates → Admin gives final approval."
        ),
    )


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
    """Attach a supporting document. Stored in Azure Blob Storage via REST API."""
    url = await _store_receipt_file(file)
    return await ExpenseService.attach_receipt(db, expense_id, url, current_user)
