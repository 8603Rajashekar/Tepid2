from datetime import datetime, UTC
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import check_permission, has_permission
from app.core.security import TokenUser
from app.modules.audit_log.service import AuditLogService
from app.modules.documents.model import Document, DocumentStatus
from app.modules.documents.schema import DocumentAction, DocumentCreate, DocumentReject

ALLOWED_TRANSITIONS: dict[DocumentStatus, list[DocumentStatus]] = {
    DocumentStatus.uploaded: [DocumentStatus.review],
    DocumentStatus.review:   [DocumentStatus.signing, DocumentStatus.approved, DocumentStatus.rejected],
    DocumentStatus.signing:  [DocumentStatus.approved, DocumentStatus.rejected],
    DocumentStatus.approved: [DocumentStatus.archived],
    DocumentStatus.rejected: [],
    DocumentStatus.archived: [],
}


async def _fetch(db: AsyncSession, doc_id: UUID) -> Document:
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def _assert_transition(doc: Document, target: DocumentStatus) -> None:
    if target not in ALLOWED_TRANSITIONS.get(doc.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move document from '{doc.status}' to '{target}'",
        )


class DocumentService:

    # ------------------------------------------------------------------
    # UPLOAD  (any authenticated user)
    # ------------------------------------------------------------------

    @staticmethod
    async def upload(
        db: AsyncSession, data: DocumentCreate, current_user: TokenUser,
    ) -> Document:
        check_permission(current_user, "documents", "own")

        doc = Document(
            name=data.name,
            file_url=data.file_url,
            folder_id=data.folder_id,
            uploaded_by=UUID(current_user.id),
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="documents",
            action="document_uploaded", record_id=str(doc.id),
            after_data={"name": doc.name, "status": doc.status},
        )
        await db.commit()
        return doc

    # ------------------------------------------------------------------
    # LIST
    # ------------------------------------------------------------------

    @staticmethod
    async def get_all(db: AsyncSession, current_user: TokenUser) -> list[Document]:
        check_permission(current_user, "documents", "read")

        if has_permission(current_user, "documents", "team"):
            result = await db.execute(select(Document).order_by(Document.created_at.desc()))
        else:
            # own — only see own uploads
            result = await db.execute(
                select(Document)
                .where(Document.uploaded_by == UUID(current_user.id))
                .order_by(Document.created_at.desc())
            )
        return list(result.scalars().all())

    @staticmethod
    async def get_one(
        db: AsyncSession, doc_id: UUID, current_user: TokenUser,
    ) -> Document:
        check_permission(current_user, "documents", "read")
        doc = await _fetch(db, doc_id)

        if (
            not has_permission(current_user, "documents", "team")
            and doc.uploaded_by != UUID(current_user.id)
        ):
            raise HTTPException(status_code=403, detail="Access denied")
        return doc

    # ------------------------------------------------------------------
    # WORKFLOW TRANSITIONS
    # ------------------------------------------------------------------

    @staticmethod
    async def send_for_review(
        db: AsyncSession, doc_id: UUID, current_user: TokenUser,
    ) -> Document:
        check_permission(current_user, "documents", "own")
        doc = await _fetch(db, doc_id)

        if (
            not has_permission(current_user, "documents", "team")
            and doc.uploaded_by != UUID(current_user.id)
        ):
            raise HTTPException(status_code=403, detail="Only the uploader can submit for review")

        _assert_transition(doc, DocumentStatus.review)
        doc.status = DocumentStatus.review

        await db.commit()
        await db.refresh(doc)
        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="documents",
            action="document_sent_for_review", record_id=str(doc.id),
            after_data={"status": doc.status},
        )
        await db.commit()
        return doc

    @staticmethod
    async def send_for_signing(
        db: AsyncSession, doc_id: UUID, current_user: TokenUser,
    ) -> Document:
        check_permission(current_user, "documents", "team")
        doc = await _fetch(db, doc_id)
        _assert_transition(doc, DocumentStatus.signing)
        doc.status = DocumentStatus.signing

        await db.commit()
        await db.refresh(doc)
        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="documents",
            action="document_sent_for_signing", record_id=str(doc.id),
            after_data={"status": doc.status},
        )
        await db.commit()
        return doc

    @staticmethod
    async def approve(
        db: AsyncSession, doc_id: UUID, current_user: TokenUser,
    ) -> Document:
        check_permission(current_user, "documents", "team")
        doc = await _fetch(db, doc_id)
        _assert_transition(doc, DocumentStatus.approved)

        doc.status      = DocumentStatus.approved
        doc.approved_by = UUID(current_user.id)
        doc.approved_at = datetime.now(UTC)

        await db.commit()
        await db.refresh(doc)
        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="documents",
            action="document_approved", record_id=str(doc.id),
            after_data={"approved_by": str(doc.approved_by)},
        )
        await db.commit()
        return doc

    @staticmethod
    async def reject(
        db: AsyncSession, doc_id: UUID, data: DocumentReject, current_user: TokenUser,
    ) -> Document:
        check_permission(current_user, "documents", "team")
        doc = await _fetch(db, doc_id)
        _assert_transition(doc, DocumentStatus.rejected)

        doc.status           = DocumentStatus.rejected
        doc.rejection_reason = data.rejection_reason

        await db.commit()
        await db.refresh(doc)
        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="documents",
            action="document_rejected", record_id=str(doc.id),
            after_data={"reason": data.rejection_reason},
        )
        await db.commit()
        return doc

    @staticmethod
    async def archive(
        db: AsyncSession, doc_id: UUID, current_user: TokenUser,
    ) -> Document:
        check_permission(current_user, "documents", "full")
        doc = await _fetch(db, doc_id)
        _assert_transition(doc, DocumentStatus.archived)

        doc.status = DocumentStatus.archived

        await db.commit()
        await db.refresh(doc)
        await AuditLogService.log(
            db, actor_id=UUID(current_user.id), module="documents",
            action="document_archived", record_id=str(doc.id),
            after_data={"status": doc.status},
        )
        await db.commit()
        return doc

    @staticmethod
    async def dispatch_action(
        db: AsyncSession, doc_id: UUID, data: DocumentAction, current_user: TokenUser,
    ) -> Document:
        """Unified action dispatcher — maps action string to the appropriate workflow method."""
        action = data.action.lower()

        # "esign" is an accepted alias for "signing"
        if action in ("esign", "signing"):
            return await DocumentService.send_for_signing(db, doc_id, current_user)
        if action == "review":
            return await DocumentService.send_for_review(db, doc_id, current_user)
        if action == "approve":
            return await DocumentService.approve(db, doc_id, current_user)
        if action == "reject":
            if not data.reason:
                from fastapi import HTTPException
                raise HTTPException(status_code=422, detail="reason is required for reject")
            return await DocumentService.reject(
                db, doc_id,
                type("_R", (), {"rejection_reason": data.reason})(),
                current_user,
            )
        if action == "archive":
            return await DocumentService.archive(db, doc_id, current_user)

        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail=f"Unknown action '{action}'. Valid: review, esign, approve, reject, archive",
        )
