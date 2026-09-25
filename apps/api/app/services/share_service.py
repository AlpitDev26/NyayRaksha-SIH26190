from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters.blockchain.blockchain_adapter import get_blockchain_adapter
from app.core.exceptions import PermissionDeniedException, ResourceNotFoundException
from app.db.models import (
    AccessGrant,
    AccessRequest,
    AuditEvent,
    Case,
    CustodyEvent,
    Document,
    User,
)
from app.schemas.share import (
    AccessGrantResponse,
    AccessRequestCreate,
    AccessRequestResponse,
    AccessRequestReview,
)


class ShareService:
    @staticmethod
    async def create_access_request(
        db: AsyncSession,
        request_data: AccessRequestCreate,
        requester: User,
    ) -> AccessRequestResponse:
        # Verify document existence
        doc_stmt = select(Document).where(Document.id == request_data.document_id)
        doc_res = await db.execute(doc_stmt)
        doc = doc_res.scalar_one_or_none()
        if not doc:
            raise ResourceNotFoundException("Document not found.")

        req = AccessRequest(
            case_id=request_data.case_id,
            document_id=request_data.document_id,
            requester_id=requester.id,
            reason=request_data.reason,
            access_type=request_data.access_type.upper(),
            requested_expiry_days=request_data.requested_expiry_days,
            status="PENDING",
        )
        db.add(req)

        # Audit request
        audit = AuditEvent(
            actor_id=requester.id,
            actor_name=requester.full_name,
            actor_role=requester.roles[0].name if requester.roles else "REVIEWER",
            action="ACCESS_REQUEST_SUBMITTED",
            resource_type="DOCUMENT",
            resource_id=doc.id,
            case_id=request_data.case_id,
            outcome="SUCCESS",
            details={"reason": request_data.reason, "type": request_data.access_type},
        )
        db.add(audit)
        await db.commit()

        return AccessRequestResponse(
            id=req.id,
            case_id=req.case_id,
            document_id=req.document_id,
            document_title=doc.title,
            requester_id=requester.id,
            requester_name=requester.full_name,
            reason=req.reason,
            access_type=req.access_type,
            requested_expiry_days=req.requested_expiry_days,
            status=req.status,
            created_at=req.created_at,
        )

    @staticmethod
    async def list_access_requests(
        db: AsyncSession,
        user: User,
        status: Optional[str] = None,
    ) -> List[AccessRequestResponse]:
        stmt = (
            select(AccessRequest)
            .order_by(desc(AccessRequest.created_at))
        )
        if status:
            stmt = stmt.where(AccessRequest.status == status.upper())

        result = await db.execute(stmt)
        requests = result.scalars().all()

        responses = []
        for r in requests:
            doc_stmt = select(Document).where(Document.id == r.document_id)
            doc = (await db.execute(doc_stmt)).scalar_one_or_none()

            req_user_stmt = select(User).where(User.id == r.requester_id)
            req_user = (await db.execute(req_user_stmt)).scalar_one_or_none()

            responses.append(
                AccessRequestResponse(
                    id=r.id,
                    case_id=r.case_id,
                    document_id=r.document_id,
                    document_title=doc.title if doc else "Document",
                    requester_id=r.requester_id,
                    requester_name=req_user.full_name if req_user else "Requester",
                    reason=r.reason,
                    access_type=r.access_type,
                    requested_expiry_days=r.requested_expiry_days,
                    status=r.status,
                    reviewed_by_id=r.reviewed_by_id,
                    reviewed_at=r.reviewed_at,
                    review_notes=r.review_notes,
                    created_at=r.created_at,
                )
            )
        return responses

    @staticmethod
    async def review_access_request(
        db: AsyncSession,
        request_id: str,
        review: AccessRequestReview,
        reviewer: User,
    ) -> AccessRequestResponse:
        stmt = select(AccessRequest).where(AccessRequest.id == request_id)
        result = await db.execute(stmt)
        req = result.scalar_one_or_none()
        if not req:
            raise ResourceNotFoundException("Access request not found.")

        now_utc = datetime.now(timezone.utc)
        req.status = review.status.upper()
        req.reviewed_by_id = reviewer.id
        req.reviewed_at = now_utc
        req.review_notes = review.notes

        if review.status.upper() == "APPROVED":
            # Create time-bound AccessGrant
            valid_until = now_utc + timedelta(days=req.requested_expiry_days)
            grant = AccessGrant(
                document_id=req.document_id,
                user_id=req.requester_id,
                access_type=req.access_type,
                valid_until=valid_until,
                is_revoked=False,
                granted_by_id=reviewer.id,
            )
            db.add(grant)
            await db.flush()

            # Anchor access grant to blockchain
            blockchain = get_blockchain_adapter()
            try:
                tx = await blockchain.record_access_event(
                    share_id=grant.id,
                    document_id=grant.document_id,
                    granted_to_user=grant.user_id,
                    access_type=grant.access_type,
                    expiry_utc=valid_until.isoformat(),
                    granted_by=reviewer.id,
                )
                grant.blockchain_tx_id = tx.get("tx_id")
            except Exception:
                pass

            # Custody event
            custody = CustodyEvent(
                case_id=req.case_id,
                document_id=req.document_id,
                action="ACCESS_GRANTED",
                actor_id=reviewer.id,
                actor_name=reviewer.full_name,
                actor_role=reviewer.roles[0].name if reviewer.roles else "OWNER",
                outcome="SUCCESS",
                reason=f"Approved access for {req.requested_expiry_days} days. Notes: {review.notes or 'None'}",
                blockchain_tx_id=grant.blockchain_tx_id,
                timestamp_utc=now_utc,
            )
            db.add(custody)

        await db.commit()
        return (await ShareService.list_access_requests(db, reviewer))[0]

    @staticmethod
    async def revoke_grant(db: AsyncSession, grant_id: str, user: User) -> bool:
        stmt = select(AccessGrant).where(AccessGrant.id == grant_id)
        result = await db.execute(stmt)
        grant = result.scalar_one_or_none()
        if not grant:
            raise ResourceNotFoundException("Grant not found.")

        grant.is_revoked = True

        # Anchor revocation on blockchain
        blockchain = get_blockchain_adapter()
        await blockchain.revoke_share(share_id=grant.id, revoked_by=user.id)

        # Audit
        audit = AuditEvent(
            actor_id=user.id,
            actor_name=user.full_name,
            action="ACCESS_REVOKED",
            resource_type="SHARE",
            resource_id=grant.id,
            outcome="SUCCESS",
        )
        db.add(audit)
        await db.commit()
        return True
