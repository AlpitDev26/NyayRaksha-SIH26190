from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AccessRequestCreate(BaseModel):
    case_id: str
    document_id: str
    reason: str = Field(..., min_length=10, max_length=1000)
    access_type: str = "VIEW"  # VIEW, PREVIEW, DOWNLOAD
    requested_expiry_days: int = Field(default=7, ge=1, le=90)


class AccessRequestReview(BaseModel):
    status: str  # APPROVED or REJECTED
    notes: Optional[str] = None


class AccessRequestResponse(BaseModel):
    id: str
    case_id: str
    document_id: str
    document_title: Optional[str] = None
    requester_id: str
    requester_name: Optional[str] = None
    reason: str
    access_type: str
    requested_expiry_days: int
    status: str
    reviewed_by_id: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_at: datetime


class AccessGrantResponse(BaseModel):
    id: str
    document_id: str
    document_title: Optional[str] = None
    user_id: str
    user_name: Optional[str] = None
    access_type: str
    valid_until: datetime
    is_revoked: bool
    granted_by_id: str
    blockchain_tx_id: Optional[str] = None
    created_at: datetime
