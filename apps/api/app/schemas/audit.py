from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class AuditEventResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    case_id: Optional[str] = None
    outcome: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    correlation_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp_utc: datetime


class SecurityAlertResponse(BaseModel):
    id: str
    alert_type: str
    severity: str
    message: str
    details: Optional[Dict[str, Any]] = None
    is_resolved: bool
    created_at: datetime


class ComplianceStatusResponse(BaseModel):
    encryption_in_transit: bool = True
    encryption_at_rest: bool = True
    mfa_enforced: bool = True
    blockchain_gateway_health: str = "HEALTHY"
    storage_health: str = "HEALTHY"
    scanner_health: str = "HEALTHY"
    pending_anchor_count: int = 0
    total_immutable_events: int = 0
    tampering_incident_count: int = 0
    legal_hold_active_count: int = 0
    last_audit_sync_utc: datetime
