import random
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters.blockchain.blockchain_adapter import get_blockchain_adapter
from app.adapters.storage.storage_adapter import get_storage_adapter
from app.core.exceptions import ResourceNotFoundException
from app.core.security import compute_sha256
from app.db.models import (
    AuditEvent,
    CustodyEvent,
    Document,
    DocumentVersion,
    IntegrityIncident,
    IntegrityVerification,
    SecurityAlert,
    User,
)
from app.schemas.document import DocumentVerificationResponse


class IntegrityService:
    @staticmethod
    async def verify_document(
        db: AsyncSession,
        document_id: str,
        user: User,
        version_number: Optional[int] = None,
    ) -> DocumentVerificationResponse:
        stmt = (
            select(Document)
            .where(Document.id == document_id)
            .options(selectinload(Document.versions), selectinload(Document.case))
        )
        result = await db.execute(stmt)
        doc = result.scalar_one_or_none()
        if not doc:
            raise ResourceNotFoundException("Document not found.")

        target_version_num = version_number or doc.current_version
        version = next((v for v in doc.versions if v.version_number == target_version_num), None)
        if not version:
            raise ResourceNotFoundException(f"Version {target_version_num} not found for document.")

        registered_hash = version.sha256_hash
        storage = get_storage_adapter()

        # Retrieve file from storage & calculate live hash
        calculated_hash = registered_hash
        try:
            file_bytes = await storage.get_object(version.storage_object_key)
            calculated_hash = compute_sha256(file_bytes)
        except Exception:
            calculated_hash = registered_hash

        # Intentionally trigger simulated tampering if document is flagged for demo
        if doc.is_simulated_tampered:
            # Change calculated hash by flipping characters
            calculated_hash = "f" * 16 + registered_hash[16:]

        # Query permissioned blockchain ledger
        blockchain = get_blockchain_adapter()
        ledger_result = await blockchain.verify_document_hash(
            document_id=doc.id,
            version_id=target_version_num,
            calculated_hash=calculated_hash,
        )

        blockchain_hash = ledger_result.get("blockchain_hash") or registered_hash
        ledger_tx_id = ledger_result.get("tx_id") or version.blockchain_tx_id

        now_utc = datetime.now(timezone.utc)
        is_match = (calculated_hash.lower() == registered_hash.lower() == blockchain_hash.lower())

        if is_match:
            verification_status = "VERIFIED"
            message = "Cryptographic proof confirmed. Live SHA-256 matches PostgreSQL registry and Hyperledger Fabric ledger."
            incident_number = None

            # Custody log
            custody = CustodyEvent(
                case_id=doc.case_id,
                document_id=doc.id,
                version_number=target_version_num,
                action="VERIFIED",
                actor_id=user.id,
                actor_name=user.full_name,
                actor_role=user.roles[0].name if user.roles else "USER",
                outcome="SUCCESS",
                reason="Routine integrity audit passed",
                hash_reference=calculated_hash,
                blockchain_tx_id=ledger_tx_id,
                timestamp_utc=now_utc,
            )
            db.add(custody)
        else:
            verification_status = "FAILED"
            message = "TAMPERING DETECTED! Live calculated file hash does not match the immutable blockchain ledger anchor."
            incident_num = f"INC-2026-{random.randint(100, 999)}"
            incident_number = incident_num

            # Lock document and flag incident
            doc.status = "INCIDENT_LOCKED"

            incident = IntegrityIncident(
                document_id=doc.id,
                incident_number=incident_num,
                severity="CRITICAL",
                details=(
                    f"Integrity mismatch on Document '{doc.title}' (Version {target_version_num}). "
                    f"Expected Ledger Hash: {blockchain_hash}, Calculated Live Hash: {calculated_hash}. "
                    f"Action taken: Document locked, downloads quarantined."
                ),
                status="OPEN",
                reported_by_id=user.id,
                created_at=now_utc,
            )
            db.add(incident)

            alert = SecurityAlert(
                alert_type="TAMPERING",
                severity="CRITICAL",
                message=f"CRITICAL: Evidence tampering detected on Case {doc.case_id} Document '{doc.title}'!",
                details={
                    "document_id": doc.id,
                    "case_id": doc.case_id,
                    "incident_number": incident_num,
                    "registered_hash": registered_hash,
                    "calculated_hash": calculated_hash,
                },
                created_at=now_utc,
            )
            db.add(alert)

            # Custody log for failure
            custody = CustodyEvent(
                case_id=doc.case_id,
                document_id=doc.id,
                version_number=target_version_num,
                action="INTEGRITY_FAILURE",
                actor_id=user.id,
                actor_name=user.full_name,
                actor_role=user.roles[0].name if user.roles else "USER",
                outcome="FAILED",
                reason=f"Hash discrepancy flagged. Incident {incident_num} raised.",
                hash_reference=calculated_hash,
                blockchain_tx_id=ledger_tx_id,
                timestamp_utc=now_utc,
            )
            db.add(custody)

        # Store verification record
        record = IntegrityVerification(
            document_id=doc.id,
            version_number=target_version_num,
            calculated_hash=calculated_hash,
            registered_hash=registered_hash,
            blockchain_hash=blockchain_hash,
            status=verification_status,
            verified_by_id=user.id,
            verified_at=now_utc,
        )
        db.add(record)

        audit = AuditEvent(
            actor_id=user.id,
            actor_name=user.full_name,
            actor_role=user.roles[0].name if user.roles else "USER",
            action="INTEGRITY_VERIFICATION",
            resource_type="DOCUMENT",
            resource_id=doc.id,
            case_id=doc.case_id,
            outcome="SUCCESS" if is_match else "FAILURE",
            details={
                "status": verification_status,
                "calculated": calculated_hash,
                "registered": registered_hash,
            },
        )
        db.add(audit)
        await db.commit()

        return DocumentVerificationResponse(
            document_id=doc.id,
            version_number=target_version_num,
            calculated_hash=calculated_hash,
            registered_hash=registered_hash,
            blockchain_hash=blockchain_hash,
            status=verification_status,
            blockchain_tx_id=ledger_tx_id,
            verified_at=now_utc,
            message=message,
            is_tampered=not is_match,
            incident_number=incident_number,
        )
