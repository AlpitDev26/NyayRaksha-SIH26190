from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class DocumentVersionResponse(BaseModel):
    id: str
    version_number: int
    sha256_hash: str
    previous_version_hash: str
    file_size_bytes: int
    mime_type: str
    original_filename: Optional[str] = None
    change_reason: Optional[str] = None
    uploader_id: str
    uploader_name: Optional[str] = None
    blockchain_tx_id: Optional[str] = None
    blockchain_status: str
    virus_scan_status: str
    created_at: datetime


class DocumentResponse(BaseModel):
    id: str
    case_id: str
    case_title: Optional[str] = None
    title: str
    description: Optional[str] = None
    document_type: str
    classification: str
    current_version: int
    status: str
    is_legal_hold: bool
    is_simulated_tampered: bool = False
    tags: Optional[str] = None
    created_by_id: str
    created_by_name: Optional[str] = None
    current_hash: Optional[str] = None
    blockchain_tx_id: Optional[str] = None
    blockchain_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    versions: List[DocumentVersionResponse] = []


class DocumentReceiptResponse(BaseModel):
    document_id: str
    title: str
    case_id: str
    version: int
    sha256_hash: str
    blockchain_tx_id: str
    storage_status: str
    virus_scan_status: str
    classification: str
    timestamp_utc: datetime


class DocumentVerificationResponse(BaseModel):
    document_id: str
    version_number: int
    calculated_hash: str
    registered_hash: str
    blockchain_hash: str
    status: str  # VERIFIED, WARNING, FAILED
    blockchain_tx_id: Optional[str] = None
    verified_at: datetime
    message: str
    is_tampered: bool = False
    incident_number: Optional[str] = None
