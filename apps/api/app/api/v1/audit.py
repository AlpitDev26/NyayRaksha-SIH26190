from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.db.session import get_db
from app.schemas.audit import (
    AuditEventResponse,
    ComplianceStatusResponse,
    SecurityAlertResponse,
)
from app.services.audit_service import AuditService
from app.services.auth_service import get_current_user, require_roles

router = APIRouter(tags=["Audit & Compliance"])


@router.get("/audit-events", response_model=List[AuditEventResponse])
async def list_audit_events(
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    case_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_roles(["ADMIN", "AUDITOR"])),
    db: AsyncSession = Depends(get_db),
):
    return await AuditService.list_audit_events(
        db=db,
        action=action,
        resource_type=resource_type,
        case_id=case_id,
        limit=limit,
    )


@router.get("/security-alerts", response_model=List[SecurityAlertResponse])
async def list_security_alerts(
    is_resolved: Optional[bool] = Query(None),
    current_user: User = Depends(require_roles(["ADMIN", "AUDITOR", "INVESTIGATING_OFFICER"])),
    db: AsyncSession = Depends(get_db),
):
    return await AuditService.list_security_alerts(db=db, is_resolved=is_resolved)


@router.get("/compliance/checklist", response_model=ComplianceStatusResponse)
async def get_compliance_checklist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AuditService.get_compliance_status(db=db)
