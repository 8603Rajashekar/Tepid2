from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import TokenUser
from app.db.session import get_db
from app.modules.documents.schema import DocumentCreate, DocumentReject, DocumentResponse
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
