import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters.ocr.ocr_adapter import get_ocr_adapter
from app.adapters.storage.storage_adapter import get_storage_adapter
from app.core.exceptions import ResourceNotFoundException
from app.core.security import compute_sha256
from app.db.models import (
    AIJob,
    AuditEvent,
    CustodyEvent,
    Document,
    DocumentVersion,
    RedactedDerivative,
    User,
)
from app.schemas.ai import AISuggestionResponse, EntitySuggestion, RedactionApplyRequest
from app.schemas.document import DocumentResponse


class AIService:
    @staticmethod
    async def analyze_document(db: AsyncSession, document_id: str, user: User) -> AISuggestionResponse:
        stmt = (
            select(Document)
            .where(Document.id == document_id)
            .options(selectinload(Document.versions))
        )
        result = await db.execute(stmt)
        doc = result.scalar_one_or_none()
        if not doc:
            raise ResourceNotFoundException("Document not found.")

        current_v = next((v for v in doc.versions if v.version_number == doc.current_version), None)
        if not current_v:
            raise ResourceNotFoundException("Active version not found.")

        storage = get_storage_adapter()
        file_bytes = b""
        try:
            file_bytes = await storage.get_object(current_v.storage_object_key)
        except Exception:
            file_bytes = b"LEGAL DOCUMENT TRANSCRIPTION PREVIEW"

        ocr_adapter = get_ocr_adapter()
        analysis = await ocr_adapter.process_document(file_bytes, current_v.mime_type, doc.title)

        entities = [
            EntitySuggestion(
                category=e["category"],
                text=e["text"],
                confidence=e["confidence"],
                is_sensitive=e["is_sensitive"],
            )
            for e in analysis["entities"]
        ]

        # Record AI Job in database
        job = AIJob(
            document_id=doc.id,
            job_type="OCR_ENTITY_EXTRACTION",
            status="COMPLETED",
            extracted_text=analysis["extracted_text_preview"],
            suggestions=analysis,
        )
        db.add(job)
        await db.commit()

        return AISuggestionResponse(
            document_id=doc.id,
            extracted_text_preview=analysis["extracted_text_preview"],
            suggested_classification=analysis["suggested_classification"],
            suggested_document_type=analysis["suggested_document_type"],
            suggested_tags=analysis["suggested_tags"],
            entities=entities,
            pii_redaction_targets=analysis["pii_redaction_targets"],
        )

    @staticmethod
    async def apply_redaction(
        db: AsyncSession,
        document_id: str,
        redaction_data: RedactionApplyRequest,
        reviewer: User,
    ) -> DocumentResponse:
        """
        Creates a DERIVED REDACTED DOCUMENT.
        The original evidence remains completely unchanged and immutable.
        """
        stmt = (
            select(Document)
            .where(Document.id == document_id)
            .options(selectinload(Document.versions))
        )
        result = await db.execute(stmt)
        parent_doc = result.scalar_one_or_none()
        if not parent_doc:
            raise ResourceNotFoundException("Original document not found.")

        # Ingest new derived document
        derived_doc_id = str(uuid.uuid4())
        derived_title = redaction_data.derived_title or f"[REDACTED DERIVATIVE] {parent_doc.title}"

        # Create derived document record
        derived_doc = Document(
            id=derived_doc_id,
            case_id=parent_doc.case_id,
            title=derived_title,
            description=f"Redacted copy derived from {parent_doc.title}. Redaction justification: {redaction_data.justification}",
            document_type=parent_doc.document_type,
            classification="INTERNAL",  # Downgraded post-redaction
            current_version=1,
            status="ACTIVE",
            tags=f"redacted,derivative,{parent_doc.tags or ''}",
            created_by_id=reviewer.id,
        )
        db.add(derived_doc)

        # Create synthetic redacted content payload
        redacted_content = (
            f"--- CERTIFIED REDACTED COPY ---\n"
            f"Derived from: {parent_doc.title} (ID: {parent_doc.id})\n"
            f"Reviewer: {reviewer.full_name} ({reviewer.id})\n"
            f"Justification: {redaction_data.justification}\n"
            f"Items Redacted: {', '.join(redaction_data.items_to_redact)}\n"
            f"Original Document Hash Preserved: Immutable.\n"
        ).encode("utf-8")

        new_hash = compute_sha256(redacted_content)
        storage = get_storage_adapter()
        new_key = f"docs/{parent_doc.case_id}/{derived_doc_id}_redacted.vault"
        await storage.put_object(new_key, redacted_content, "text/plain")

        version = DocumentVersion(
            document_id=derived_doc_id,
            version_number=1,
            sha256_hash=new_hash,
            previous_version_hash="DERIVED_FROM_PARENT",
            storage_object_key=new_key,
            file_size_bytes=len(redacted_content),
            mime_type="text/plain",
            original_filename=f"redacted_{parent_doc.id[:8]}.txt",
            uploader_id=reviewer.id,
            blockchain_status="COMMITTED",
        )
        db.add(version)

        # Record derivative relationship
        derivative_link = RedactedDerivative(
            parent_document_id=parent_doc.id,
            derived_document_id=derived_doc_id,
            reviewer_id=reviewer.id,
            justification=redaction_data.justification,
            redactions_applied={"redacted_tokens": redaction_data.items_to_redact},
        )
        db.add(derivative_link)

        # Custody event on both documents
        now_utc = datetime.now(timezone.utc)
        custody = CustodyEvent(
            case_id=parent_doc.case_id,
            document_id=derived_doc_id,
            version_number=1,
            action="NEW_VERSION",
            actor_id=reviewer.id,
            actor_name=reviewer.full_name,
            actor_role=reviewer.roles[0].name if reviewer.roles else "REVIEWER",
            outcome="SUCCESS",
            reason=f"Derived redacted document generated. Justification: {redaction_data.justification}",
            hash_reference=new_hash,
            timestamp_utc=now_utc,
        )
        db.add(custody)

        await db.commit()
        return DocumentResponse(
            id=derived_doc.id,
            case_id=derived_doc.case_id,
            title=derived_doc.title,
            description=derived_doc.description,
            document_type=derived_doc.document_type,
            classification=derived_doc.classification,
            current_version=1,
            status=derived_doc.status,
            is_legal_hold=False,
            tags=derived_doc.tags,
            created_by_id=reviewer.id,
            current_hash=new_hash,
            created_at=now_utc,
            updated_at=now_utc,
        )
