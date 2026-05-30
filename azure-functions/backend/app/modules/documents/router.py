import shutil
import uuid as _uuid
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import os as _os
# On Azure Linux the wwwroot directory is read-only — use /tmp instead
if _os.name == "nt":
    UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads"
else:
    UPLOAD_DIR = Path("/tmp/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv",
                      ".jpg", ".jpeg", ".png", ".gif", ".zip", ".txt"}

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.documents.schema import DocumentAction, DocumentCreate, DocumentReject, DocumentResponse
from app.modules.documents.service import DocumentService

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await DocumentService.get_all(db, current_user)


@router.get("/me", response_model=list[DocumentResponse])
async def my_documents(
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    from sqlalchemy import select
    from app.modules.documents.model import Document
    from uuid import UUID as _UUID
    result = await db.execute(
        select(Document)
        .where(Document.uploaded_by == _UUID(current_user.id))
        .order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await DocumentService.get_one(db, doc_id, current_user)


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    folder_id: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Real file upload — saves to disk, version-bumps if same filename exists."""
    from app.modules.documents.model import Document

    suffix = Path(file.filename or "file").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{suffix}' not allowed")

    # Version control — find existing doc with same name
    result = await db.execute(
        select(Document).where(Document.name == file.filename).order_by(Document.version.desc())
    )
    existing = result.scalars().first()
    version = (existing.version + 1) if existing else 1

    file_id = str(_uuid.uuid4())
    safe_name = f"{file_id}{suffix}"
    dest = UPLOAD_DIR / safe_name

    with dest.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)

    file_url = f"/uploads/{safe_name}"
    folder_uuid = None
    if folder_id:
        try:
            folder_uuid = UUID(folder_id)
        except ValueError:
            pass

    from app.modules.documents.model import Document, DocumentStatus
    doc = Document(
        name=file.filename,
        file_url=file_url,
        version=version,
        folder_id=folder_uuid,
        uploaded_by=UUID(current_user.id),
        status=DocumentStatus.uploaded,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.post("/", response_model=DocumentResponse, status_code=201)
async def upload_document(
    data: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await DocumentService.upload(db, data, current_user)


@router.post("/{doc_id}/review", response_model=DocumentResponse)
async def send_for_review(
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await DocumentService.send_for_review(db, doc_id, current_user)


@router.post("/{doc_id}/signing", response_model=DocumentResponse)
async def send_for_signing(
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await DocumentService.send_for_signing(db, doc_id, current_user)


@router.post("/{doc_id}/approve", response_model=DocumentResponse)
async def approve_document(
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await DocumentService.approve(db, doc_id, current_user)


@router.post("/{doc_id}/reject", response_model=DocumentResponse)
async def reject_document(
    doc_id: UUID,
    data: DocumentReject,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await DocumentService.reject(db, doc_id, data, current_user)


@router.post("/{doc_id}/archive", response_model=DocumentResponse)
async def archive_document(
    doc_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    return await DocumentService.archive(db, doc_id, current_user)


@router.post("/{doc_id}/action", response_model=DocumentResponse)
async def document_action(
    doc_id: UUID,
    data: DocumentAction,
    db: AsyncSession = Depends(get_db),
    current_user: TokenUser = Depends(get_current_user),
):
    """Unified action endpoint. action: review | esign | approve | reject | archive"""
    return await DocumentService.dispatch_action(db, doc_id, data, current_user)
