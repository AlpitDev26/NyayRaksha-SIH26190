from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class MFARequest(BaseModel):
    temp_token: str
    code: str


class UserBase(BaseModel):
    id: str
    email: str
    full_name: str
    organization_name: Optional[str] = None
    organization_code: Optional[str] = None
    roles: List[str] = []
    is_mfa_enabled: bool = False
    last_login_at: Optional[datetime] = None


class LoginResponse(BaseModel):
    status: str  # "AUTHENTICATED" or "MFA_REQUIRED"
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    temp_token: Optional[str] = None
    user: Optional[UserBase] = None
    message: Optional[str] = None


class TokenPayload(BaseModel):
    sub: str
    roles: List[str] = []
    org_id: Optional[str] = None
    type: str = "access"
    exp: Optional[int] = None
