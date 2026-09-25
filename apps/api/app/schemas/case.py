from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CaseAssignmentResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    role_in_case: str
    assigned_at: datetime


class CaseCreate(BaseModel):
    fir_number: Optional[str] = None
    title: str = Field(..., min_length=3, max_length=255)
    category: str  # CYBER_CRIME, FINANCIAL_FRAUD, HOMICIDE, MISSING_PERSON, NARCOTICS, CORRUPTION, OTHER
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    jurisdiction: str
    lead_investigator_id: Optional[str] = None
    classification: str = "RESTRICTED"  # PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, SEALED
    summary: Optional[str] = None
    tags: Optional[str] = None


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    summary: Optional[str] = None
    is_legal_hold: Optional[bool] = None
    classification: Optional[str] = None


class CaseResponse(BaseModel):
    id: str
    fir_number: Optional[str] = None
    title: str
    category: str
    status: str
    priority: str
    jurisdiction: str
    lead_investigator_id: Optional[str] = None
    lead_investigator_name: Optional[str] = None
    date_opened: datetime
    summary: Optional[str] = None
    classification: str
    is_legal_hold: bool
    tags: Optional[str] = None
    document_count: int = 0
    assignments: List[CaseAssignmentResponse] = []
    created_at: datetime
    updated_at: datetime
