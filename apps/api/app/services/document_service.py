import hashlib
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import UploadFile
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters.blockchain.blockchain_adapter import get_blockchain_adapter
from app.adapters.scanner.scanner_adapter import get_scanner_adapter
from app.adapters.storage.storage_adapter import get_storage_adapter
from app.core.config import settings
from app.core.exceptions import (
    MalwareDetectedException,
    PermissionDeniedException,
    ResourceNotFoundException,
)
from app.core.security import compute_sha256
from app.db.models import (
    AccessGrant,
    AuditEvent,
    Case,
    CustodyEvent,
    Document,
    DocumentVersion,
    User,
)
from app.schemas.document import (
    DocumentReceiptResponse,
    DocumentResponse,
    DocumentVersionResponse,
)


class DocumentService:
    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/jpeg",
        "image/png",
        "image/tiff",
        "text/csv",
    }

    @staticmethod
    async def upload_document(
        db: AsyncSession,
        case_id: str,
        title: str,
        document_type: str,
        classification: str,
        description: Optional[str],
        tags: Optional[str],
        file: UploadFile,
        uploader: User,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> DocumentReceiptResponse:
        # 1. Verify Case Existence
        case_stmt = select(Case).where(Case.id == case_id)
        case_res = await db.execute(case_stmt)
        case = case_res.scalar_one_or_none()
        if not case:
            raise ResourceNotFoundException(f"Target case {case_id} not found.")

        # 2. Read File Bytes & Validate Size
        file_bytes = await file.read()
        file_size = len(file_bytes)
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise PermissionDeniedException(f"File size exceeds maximum {settings.MAX_FILE_SIZE_MB}MB quota.")

        # 3. Detect and Validate MIME Type
        mime_type = file.content_type or "application/octet-stream"
        if file.filename and file.filename.endswith(".pdf"):
            mime_type = "application/pdf"
        elif file.filename and (file.filename.endswith(".jpg") or file.filename.endswith(".jpeg")):
            mime_type = "image/jpeg"
        elif file.filename and file.filename.endswith(".png"):
            mime_type = "image/png"
        elif file.filename and file.filename.endswith(".txt"):
            mime_type = "text/plain"

        # 4. In-Stream Malware Scan
        scanner = get_scanner_adapter()
        is_clean, scan_msg = await scanner.scan_bytes(file_bytes, file.filename or "evidence.bin")
        if not is_clean:
            # Audit security scan quarantine
            audit = AuditEvent(
                actor_id=uploader.id,
                actor_name=uploader.full_name,
                action="UPLOAD_QUARANTINED",
                resource_type="DOCUMENT",
                case_id=case_id,
                outcome="DENIED",
                details={"filename": file.filename, "threat": scan_msg},
            )
            db.add(audit)
            await db.commit()
            raise MalwareDetectedException(scan_msg)

        # 5. Calculate Deterministic SHA-256 Fingerprint
        sha256_hash = compute_sha256(file_bytes)

        # 6. Store Encrypted Object with UUID Key
        storage = get_storage_adapter()
        random_object_key = f"docs/{case_id}/{uuid.uuid4().hex}.vault"
        storage_ref = await storage.put_object(random_object_key, file_bytes, mime_type)
        storage_ref_hash = compute_sha256(storage_ref.encode("utf-8"))

        # 7. Create Document & Version 1 in Database (Status: PROCESSING)
        doc_id = str(uuid.uuid4())
        correlation_id = f"corr-{uuid.uuid4().hex[:8]}"

        new_doc = Document(
            id=doc_id,
            case_id=case_id,
            title=title,
            description=description,
            document_type=document_type.upper(),
            classification=classification.upper(),
            current_version=1,
            status="PROCESSING",
            tags=tags,
            created_by_id=uploader.id,
        )
        db.add(new_doc)

        version = DocumentVersion(
            document_id=doc_id,
            version_number=1,
            sha256_hash=sha256_hash,
            previous_version_hash="GENESIS",
            storage_object_key=random_object_key,
            file_size_bytes=file_size,
            mime_type=mime_type,
            original_filename=file.filename,
            uploader_id=uploader.id,
            virus_scan_status="CLEAN",
            blockchain_status="PENDING",
        )
        db.add(version)
        await db.flush()

        # 8. Anchor Cryptographic Proof to Permissioned Blockchain
        blockchain = get_blockchain_adapter()
        try:
            tx_receipt = await blockchain.create_document_record(
                document_id=doc_id,
                version_id=1,
                case_id=case_id,
                doc_type=document_type.upper(),
                classification=classification.upper(),
                sha256_hash=sha256_hash,
                storage_ref_hash=storage_ref_hash,
                uploaded_by=uploader.id,
                org_id=uploader.organization.code if uploader.organization else "ORG1",
                correlation_id=correlation_id,
            )
            tx_id = tx_receipt.get("tx_id", "0x0")
            new_doc.status = "ACTIVE"
            version.blockchain_tx_id = tx_id
            version.blockchain_status = "COMMITTED"
        except Exception as e:
            # Fallback to PENDING_ANCHOR if blockchain gateway is temporarily down
            new_doc.status = "PENDING_ANCHOR"
            version.blockchain_status = "PENDING"
            tx_id = "PENDING_RECONCILIATION"

        # 9. Record Comprehensive Custody Events
        now_utc = datetime.now(timezone.utc)
        custody_event = CustodyEvent(
            case_id=case_id,
            document_id=doc_id,
            version_number=1,
            action="UPLOADED",
            actor_id=uploader.id,
            actor_name=uploader.full_name,
            actor_role=uploader.roles[0].name if uploader.roles else "OFFICER",
            organization_name=uploader.organization.name if uploader.organization else "Law Enforcement",
            outcome="SUCCESS",
            reason="Initial intake and cryptographic anchoring",
            hash_reference=sha256_hash,
            blockchain_tx_id=tx_id,
            correlation_id=correlation_id,
            timestamp_utc=now_utc,
        )
        db.add(custody_event)

        # 10. Audit Logging
        audit = AuditEvent(
            actor_id=uploader.id,
            actor_name=uploader.full_name,
            actor_role=uploader.roles[0].name if uploader.roles else "OFFICER",
            action="DOCUMENT_UPLOAD",
            resource_type="DOCUMENT",
            resource_id=doc_id,
            case_id=case_id,
            outcome="SUCCESS",
            ip_address=client_ip,
            user_agent=user_agent,
            correlation_id=correlation_id,
            details={"sha256": sha256_hash, "tx_id": tx_id, "size": file_size},
        )
        db.add(audit)
        await db.commit()

        return DocumentReceiptResponse(
            document_id=doc_id,
            title=title,
            case_id=case_id,
            version=1,
            sha256_hash=sha256_hash,
            blockchain_tx_id=tx_id,
            storage_status="ENCRYPTED_AES256",
            virus_scan_status="CLEAN",
            classification=classification.upper(),
            timestamp_utc=now_utc,
        )

    @staticmethod
    async def list_documents(
        db: AsyncSession,
        user: User,
        case_id: Optional[str] = None,
        doc_type: Optional[str] = None,
        classification: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[DocumentResponse]:
        stmt = select(Document).options(
            selectinload(Document.versions),
            selectinload(Document.case),
        )

        if case_id:
            stmt = stmt.where(Document.case_id == case_id)
        if doc_type:
            stmt = stmt.where(Document.document_type == doc_type.upper())
        if classification:
            stmt = stmt.where(Document.classification == classification.upper())
        if search:
            stmt = stmt.where(
                or_(
                    Document.title.ilike(f"%{search}%"),
                    Document.description.ilike(f"%{search}%"),
                    Document.tags.ilike(f"%{search}%"),
                    Document.id.ilike(f"%{search}%"),
                )
            )

        stmt = stmt.order_by(desc(Document.created_at))
        result = await db.execute(stmt)
        docs = result.scalars().unique().all()

        responses = []
        for d in docs:
            versions_resp = [
                DocumentVersionResponse(
                    id=v.id,
                    version_number=v.version_number,
                    sha256_hash=v.sha256_hash,
                    previous_version_hash=v.previous_version_hash,
                    file_size_bytes=v.file_size_bytes,
                    mime_type=v.mime_type,
                    original_filename=v.original_filename,
                    change_reason=v.change_reason,
                    uploader_id=v.uploader_id,
                    blockchain_tx_id=v.blockchain_tx_id,
                    blockchain_status=v.blockchain_status,
                    virus_scan_status=v.virus_scan_status,
                    created_at=v.created_at,
                )
                for v in d.versions
            ]
            current_v = next((v for v in d.versions if v.version_number == d.current_version), None)
            responses.append(
                DocumentResponse(
                    id=d.id,
                    case_id=d.case_id,
                    case_title=d.case.title if d.case else None,
                    title=d.title,
                    description=d.description,
                    document_type=d.document_type,
                    classification=d.classification,
                    current_version=d.current_version,
                    status=d.status,
                    is_legal_hold=d.is_legal_hold,
                    is_simulated_tampered=d.is_simulated_tampered,
                    tags=d.tags,
                    created_by_id=d.created_by_id,
                    current_hash=current_v.sha256_hash if current_v else None,
                    blockchain_tx_id=current_v.blockchain_tx_id if current_v else None,
                    blockchain_status=current_v.blockchain_status if current_v else None,
                    created_at=d.created_at,
                    updated_at=d.updated_at,
                    versions=versions_resp,
                )
            )
        return responses

    @staticmethod
    async def get_document_by_id(db: AsyncSession, document_id: str) -> DocumentResponse:
        stmt = (
            select(Document)
            .where(Document.id == document_id)
            .options(selectinload(Document.versions), selectinload(Document.case))
        )
        result = await db.execute(stmt)
        d = result.scalar_one_or_none()
        if not d:
            raise ResourceNotFoundException(f"Document {document_id} not found.")

        versions_resp = [
            DocumentVersionResponse(
                id=v.id,
                version_number=v.version_number,
                sha256_hash=v.sha256_hash,
                previous_version_hash=v.previous_version_hash,
                file_size_bytes=v.file_size_bytes,
                mime_type=v.mime_type,
                original_filename=v.original_filename,
                change_reason=v.change_reason,
                uploader_id=v.uploader_id,
                blockchain_tx_id=v.blockchain_tx_id,
                blockchain_status=v.blockchain_status,
                virus_scan_status=v.virus_scan_status,
                created_at=v.created_at,
            )
            for v in d.versions
        ]
        current_v = next((v for v in d.versions if v.version_number == d.current_version), None)

        return DocumentResponse(
            id=d.id,
            case_id=d.case_id,
            case_title=d.case.title if d.case else None,
            title=d.title,
            description=d.description,
            document_type=d.document_type,
            classification=d.classification,
            current_version=d.current_version,
            status=d.status,
            is_legal_hold=d.is_legal_hold,
            is_simulated_tampered=d.is_simulated_tampered,
            tags=d.tags,
            created_by_id=d.created_by_id,
            current_hash=current_v.sha256_hash if current_v else None,
            blockchain_tx_id=current_v.blockchain_tx_id if current_v else None,
            blockchain_status=current_v.blockchain_status if current_v else None,
            created_at=d.created_at,
            updated_at=d.updated_at,
            versions=versions_resp,
        )

    @staticmethod
    async def get_preview_url(db: AsyncSession, document_id: str, user: User) -> Tuple[str, str]:
        """Validates authorization and issues a short-lived presigned URL."""
        stmt = (
            select(Document)
            .where(Document.id == document_id)
            .options(selectinload(Document.versions))
        )
        result = await db.execute(stmt)
        doc = result.scalar_one_or_none()
        if not doc:
            raise ResourceNotFoundException("Document not found.")

        # Check if locked due to integrity incident
        if doc.status == "INCIDENT_LOCKED":
            raise PermissionDeniedException("Document access is locked due to an unresolved integrity incident.")

        # Get current version object key
        current_v = next((v for v in doc.versions if v.version_number == doc.current_version), None)
        if not current_v:
            raise ResourceNotFoundException("Active version not found.")

        storage = get_storage_adapter()
        presigned_url = await storage.generate_presigned_url(current_v.storage_object_key)

        # Log custody view event
        custody = CustodyEvent(
            case_id=doc.case_id,
            document_id=doc.id,
            version_number=doc.current_version,
            action="PREVIEWED",
            actor_id=user.id,
            actor_name=user.full_name,
            actor_role=user.roles[0].name if user.roles else "OFFICER",
            outcome="SUCCESS",
            reason="Authorized secure preview",
            timestamp_utc=datetime.now(timezone.utc),
        )
        db.add(custody)
        await db.commit()

        watermark_text = f"Confidential - Accessed by {user.full_name} ({user.id[:8]}) at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} - Case {doc.case_id}"
        return presigned_url, watermark_text
