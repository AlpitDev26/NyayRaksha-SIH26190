from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class CustodyEventResponse(BaseModel):
    id: str
    case_id: str
    document_id: str
    version_number: int
    action: str
    actor_id: str
    actor_name: Optional[str] = None
    actor_role: str
    organization_name: Optional[str] = None
    outcome: str
    reason: Optional[str] = None
    hash_reference: Optional[str] = None
    blockchain_tx_id: Optional[str] = None
    correlation_id: Optional[str] = None
    timestamp_utc: datetime


class CustodyReportResponse(BaseModel):
    document_id: str
    document_title: str
    case_id: str
    generated_at: datetime
    total_events: int
    is_chain_intact: bool
    events: List[CustodyEventResponse]
