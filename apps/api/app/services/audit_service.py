from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.blockchain.blockchain_adapter import get_blockchain_adapter
from app.db.models import (
    AuditEvent,
    Case,
    CustodyEvent,
    Document,
    IntegrityIncident,
    SecurityAlert,
)
from app.schemas.audit import (
    AuditEventResponse,
    ComplianceStatusResponse,
    SecurityAlertResponse,
)


class AuditService:
    @staticmethod
    async def list_audit_events(
        db: AsyncSession,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        case_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[AuditEventResponse]:
        stmt = select(AuditEvent).order_by(desc(AuditEvent.timestamp_utc)).limit(limit)
        if action:
            stmt = stmt.where(AuditEvent.action == action.upper())
        if resource_type:
            stmt = stmt.where(AuditEvent.resource_type == resource_type.upper())
        if case_id:
            stmt = stmt.where(AuditEvent.case_id == case_id)

        result = await db.execute(stmt)
        events = result.scalars().all()

        return [
            AuditEventResponse(
                id=e.id,
                actor_id=e.actor_id,
                actor_name=e.actor_name,
                actor_role=e.actor_role,
                action=e.action,
                resource_type=e.resource_type,
                resource_id=e.resource_id,
                case_id=e.case_id,
                outcome=e.outcome,
                ip_address=e.ip_address,
                user_agent=e.user_agent,
                correlation_id=e.correlation_id,
                details=e.details,
                timestamp_utc=e.timestamp_utc,
            )
            for e in events
        ]

    @staticmethod
    async def list_security_alerts(
        db: AsyncSession,
        is_resolved: Optional[bool] = None,
    ) -> List[SecurityAlertResponse]:
        stmt = select(SecurityAlert).order_by(desc(SecurityAlert.created_at))
        if is_resolved is not None:
            stmt = stmt.where(SecurityAlert.is_resolved == is_resolved)

        result = await db.execute(stmt)
        alerts = result.scalars().all()

        return [
            SecurityAlertResponse(
                id=a.id,
                alert_type=a.alert_type,
                severity=a.severity,
                message=a.message,
                details=a.details,
                is_resolved=a.is_resolved,
                created_at=a.created_at,
            )
            for a in alerts
        ]

    @staticmethod
    async def get_compliance_status(db: AsyncSession) -> ComplianceStatusResponse:
        blockchain = get_blockchain_adapter()
        ledger_stats = await blockchain.get_ledger_stats()

        # Count records
        total_custody_count = await db.scalar(select(func.count(CustodyEvent.id))) or 0
        total_audit_count = await db.scalar(select(func.count(AuditEvent.id))) or 0
        tampering_count = await db.scalar(select(func.count(IntegrityIncident.id))) or 0
        legal_holds_count = await db.scalar(select(func.count(Case.id)).where(Case.is_legal_hold == True)) or 0
        pending_anchor_count = await db.scalar(
            select(func.count(Document.id)).where(Document.status == "PENDING_ANCHOR")
        ) or 0

        return ComplianceStatusResponse(
            encryption_in_transit=True,
            encryption_at_rest=True,
            mfa_enforced=True,
            blockchain_gateway_health=ledger_stats.get("status", "HEALTHY"),
            storage_health="HEALTHY",
            scanner_health="HEALTHY",
            pending_anchor_count=pending_anchor_count,
            total_immutable_events=total_custody_count + total_audit_count,
            tampering_incident_count=tampering_count,
            legal_hold_active_count=legal_holds_count,
            last_audit_sync_utc=datetime.now(timezone.utc),
        )
