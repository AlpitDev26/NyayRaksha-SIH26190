from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SignatureCreate(BaseModel):
    version_number: int = Field(default=1, ge=1)
    statement: str = Field(..., min_length=10)
    certificate_thumbprint: Optional[str] = "SHA256:CERT-APP-DEMO-METADATA"


class SignatureResponse(BaseModel):
    id: str
    document_id: str
    version_number: int
    signer_id: str
    signer_name: Optional[str] = None
    signer_role: str
    signed_hash: str
    certificate_thumbprint: Optional[str] = None
    statement: str
    blockchain_tx_id: Optional[str] = None
    signed_at: datetime
    disclaimer: str = "Demo signature metadata only. Production deployment requires approved PKI/e-signature integration and legal review."
