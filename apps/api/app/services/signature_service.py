import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters.blockchain.blockchain_adapter import get_blockchain_adapter
from app.core.exceptions import PermissionDeniedException, ResourceNotFoundException
from app.db.models import AuditEvent, CustodyEvent, DigitalSignature, Document, User
from app.schemas.signature import SignatureCreate, SignatureResponse


class SignatureService:
    @staticmethod
    async def sign_document(
        db: AsyncSession,
        document_id: str,
        sign_data: SignatureCreate,
        signer: User,
    ) -> SignatureResponse:
        user_roles = [r.name for r in signer.roles]
        allowed_roles = {"JUDGE", "PROSECUTOR", "ADMIN"}
        if not any(r in allowed_roles for r in user_roles):
            raise PermissionDeniedException("Only Judicial Officers (Judges, Prosecutors) can digitally sign court documents.")

        stmt = (
            select(Document)
            .where(Document.id == document_id)
            .options(selectinload(Document.versions))
        )
        result = await db.execute(stmt)
        doc = result.scalar_one_or_none()
        if not doc:
            raise ResourceNotFoundException("Document not found.")

        version = next((v for v in doc.versions if v.version_number == sign_data.version_number), None)
        if not version:
            raise ResourceNotFoundException(f"Version {sign_data.version_number} not found.")

        now_utc = datetime.now(timezone.utc)
        sig_id = str(uuid.uuid4())
        thumbprint = sign_data.certificate_thumbprint or f"SHA256:CERT-{signer.id[:8].upper()}"

        # Anchor signature event to permissioned blockchain
        blockchain = get_blockchain_adapter()
        tx_receipt = await blockchain.record_signature_event(
            signature_id=sig_id,
            document_id=doc.id,
            version_id=sign_data.version_number,
            signer_id=signer.id,
            signer_role=user_roles[0],
            signed_hash=version.sha256_hash,
            cert_thumb=thumbprint,
        )
        tx_id = tx_receipt.get("tx_id", "0x0")

        # Save signature record in database
        signature = DigitalSignature(
            id=sig_id,
            document_id=doc.id,
            version_number=sign_data.version_number,
            signer_id=signer.id,
            signer_name=signer.full_name,
            signer_role=user_roles[0],
            signed_hash=version.sha256_hash,
            certificate_thumbprint=thumbprint,
            statement=sign_data.statement,
            blockchain_tx_id=tx_id,
            signed_at=now_utc,
        )
        db.add(signature)

        # Custody event: SIGNED
        custody = CustodyEvent(
            case_id=doc.case_id,
            document_id=doc.id,
            version_number=sign_data.version_number,
            action="SIGNED",
            actor_id=signer.id,
            actor_name=signer.full_name,
            actor_role=user_roles[0],
            outcome="SUCCESS",
            reason=f"Judicial attestation: {sign_data.statement[:100]}",
            hash_reference=version.sha256_hash,
            blockchain_tx_id=tx_id,
            timestamp_utc=now_utc,
        )
        db.add(custody)

        # Audit
        audit = AuditEvent(
            actor_id=signer.id,
            actor_name=signer.full_name,
            actor_role=user_roles[0],
            action="DIGITAL_SIGNATURE_AFFIXED",
            resource_type="DOCUMENT",
            resource_id=doc.id,
            case_id=doc.case_id,
            outcome="SUCCESS",
            details={"version": sign_data.version_number, "hash": version.sha256_hash, "tx_id": tx_id},
        )
        db.add(audit)
        await db.commit()

        return SignatureResponse(
            id=signature.id,
            document_id=doc.id,
            version_number=signature.version_number,
            signer_id=signer.id,
            signer_name=signer.full_name,
            signer_role=signature.signer_role,
            signed_hash=signature.signed_hash,
            certificate_thumbprint=signature.certificate_thumbprint,
            statement=signature.statement,
            blockchain_tx_id=tx_id,
            signed_at=now_utc,
        )

    @staticmethod
    async def get_document_signatures(db: AsyncSession, document_id: str) -> List[SignatureResponse]:
        stmt = (
            select(DigitalSignature)
            .where(DigitalSignature.document_id == document_id)
            .order_by(desc(DigitalSignature.signed_at))
        )
        result = await db.execute(stmt)
        sigs = result.scalars().all()
        return [
            SignatureResponse(
                id=s.id,
                document_id=s.document_id,
                version_number=s.version_number,
                signer_id=s.signer_id,
                signer_name=s.signer_name,
                signer_role=s.signer_role,
                signed_hash=s.signed_hash,
                certificate_thumbprint=s.certificate_thumbprint,
                statement=s.statement,
                blockchain_tx_id=s.blockchain_tx_id,
                signed_at=s.signed_at,
            )
            for s in sigs
        ]
