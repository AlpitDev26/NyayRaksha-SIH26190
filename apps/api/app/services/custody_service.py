from datetime import datetime, timezone
from typing import List
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ResourceNotFoundException
from app.db.models import CustodyEvent, Document
from app.schemas.custody import CustodyEventResponse, CustodyReportResponse


class CustodyService:
    @staticmethod
    async def get_document_custody(db: AsyncSession, document_id: str) -> List[CustodyEventResponse]:
        stmt = (
            select(CustodyEvent)
            .where(CustodyEvent.document_id == document_id)
            .order_by(desc(CustodyEvent.timestamp_utc))
        )
        result = await db.execute(stmt)
        events = result.scalars().all()

        return [
            CustodyEventResponse(
                id=e.id,
                case_id=e.case_id,
                document_id=e.document_id,
                version_number=e.version_number,
                action=e.action,
                actor_id=e.actor_id,
                actor_name=e.actor_name,
                actor_role=e.actor_role,
                organization_name=e.organization_name,
                outcome=e.outcome,
                reason=e.reason,
                hash_reference=e.hash_reference,
                blockchain_tx_id=e.blockchain_tx_id,
                correlation_id=e.correlation_id,
                timestamp_utc=e.timestamp_utc,
            )
            for e in events
        ]

    @staticmethod
    async def generate_custody_report(db: AsyncSession, document_id: str) -> CustodyReportResponse:
        doc_stmt = select(Document).where(Document.id == document_id)
        doc_res = await db.execute(doc_stmt)
        doc = doc_res.scalar_one_or_none()
        if not doc:
            raise ResourceNotFoundException("Document not found.")

        events = await CustodyService.get_document_custody(db, document_id)
        is_chain_intact = not any(e.action == "INTEGRITY_FAILURE" for e in events)

        return CustodyReportResponse(
            document_id=doc.id,
            document_title=doc.title,
            case_id=doc.case_id,
            generated_at=datetime.now(timezone.utc),
            total_events=len(events),
            is_chain_intact=is_chain_intact,
            events=events,
        )
