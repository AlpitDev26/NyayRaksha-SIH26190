import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    Index,
)
from sqlalchemy.orm import relationship
from app.db.base import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, unique=True)
    code = Column(String(50), nullable=False, unique=True)
    org_type = Column(String(50), nullable=False)  # POLICE, COURT, PROSECUTION, FORENSIC, AUDIT
    created_at = Column(DateTime(timezone=True), default=utc_now)

    users = relationship("User", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    is_mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(255), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    failed_login_count = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    organization = relationship("Organization", back_populates="users")
    roles = relationship("Role", secondary="user_roles", back_populates="users")
    case_assignments = relationship("CaseAssignment", back_populates="user")


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(String(255), nullable=True)

    users = relationship("User", secondary="user_roles", back_populates="roles")


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)


class Case(Base):
    __tablename__ = "cases"

    id = Column(String(50), primary_key=True)  # e.g., CASE-2026-000101
    fir_number = Column(String(100), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    status = Column(String(50), default="OPEN", index=True)  # OPEN, UNDER_INVESTIGATION, UNDER_REVIEW, FILED_IN_COURT, CLOSED, ARCHIVED
    priority = Column(String(50), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    jurisdiction = Column(String(255), nullable=False)
    lead_investigator_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    date_opened = Column(DateTime(timezone=True), default=utc_now)
    summary = Column(Text, nullable=True)
    classification = Column(String(50), default="RESTRICTED")  # PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, SEALED
    retention_date = Column(DateTime(timezone=True), nullable=True)
    is_legal_hold = Column(Boolean, default=False)
    tags = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    assignments = relationship("CaseAssignment", back_populates="case", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")


class CaseAssignment(Base):
    __tablename__ = "case_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(50), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_in_case = Column(String(100), default="INVESTIGATOR")
    assigned_at = Column(DateTime(timezone=True), default=utc_now)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    case = relationship("Case", back_populates="assignments")
    user = relationship("User", back_populates="case_assignments")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(50), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    document_type = Column(String(50), nullable=False, index=True)  # FIR, WITNESS_STATEMENT, FORENSIC_REPORT, CHARGE_SHEET, COURT_ORDER, EVIDENCE_ITEM, etc.
    classification = Column(String(50), default="RESTRICTED", index=True)  # PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, SEALED
    current_version = Column(Integer, default=1)
    status = Column(String(50), default="ACTIVE", index=True)  # PROCESSING, ACTIVE, PENDING_ANCHOR, QUARANTINED, INCIDENT_LOCKED, ARCHIVED
    is_legal_hold = Column(Boolean, default=False)
    is_simulated_tampered = Column(Boolean, default=False)
    tags = Column(String(255), nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    case = relationship("Case", back_populates="documents")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")
    signatures = relationship("DigitalSignature", back_populates="document")
    custody_events = relationship("CustodyEvent", back_populates="document")


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    previous_version_hash = Column(String(64), default="GENESIS")
    storage_object_key = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    original_filename = Column(String(255), nullable=True)
    change_reason = Column(String(255), nullable=True)
    uploader_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    blockchain_tx_id = Column(String(100), nullable=True)
    blockchain_status = Column(String(50), default="COMMITTED")  # COMMITTED, PENDING, FAILED
    virus_scan_status = Column(String(50), default="CLEAN")  # CLEAN, INFECTED, SKIPPED
    created_at = Column(DateTime(timezone=True), default=utc_now)

    document = relationship("Document", back_populates="versions")


class CustodyEvent(Base):
    __tablename__ = "custody_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    version_number = Column(Integer, default=1)
    action = Column(String(50), nullable=False, index=True)  # CREATED, UPLOADED, HASHED, STORED, VIEWED, DOWNLOADED, SHARED, TRANSFERRED, SIGNED, VERIFIED, INTEGRITY_FAILURE
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    actor_name = Column(String(255), nullable=True)
    actor_role = Column(String(50), nullable=False)
    organization_name = Column(String(255), nullable=True)
    outcome = Column(String(50), default="SUCCESS")  # SUCCESS, DENIED, FAILED
    reason = Column(String(255), nullable=True)
    hash_reference = Column(String(64), nullable=True)
    blockchain_tx_id = Column(String(100), nullable=True)
    correlation_id = Column(String(100), nullable=True)
    timestamp_utc = Column(DateTime(timezone=True), default=utc_now, index=True)

    document = relationship("Document", back_populates="custody_events")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), nullable=True, index=True)
    actor_name = Column(String(255), nullable=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False)  # CASE, DOCUMENT, USER, SHARE, SIGNATURE, SYSTEM
    resource_id = Column(String(100), nullable=True, index=True)
    case_id = Column(String(50), nullable=True, index=True)
    outcome = Column(String(50), default="SUCCESS")  # SUCCESS, FAILURE, DENIED
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    correlation_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    timestamp_utc = Column(DateTime(timezone=True), default=utc_now, index=True)


class BlockchainTransaction(Base):
    __tablename__ = "blockchain_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tx_id = Column(String(100), nullable=False, unique=True, index=True)
    channel = Column(String(100), default="nyayavaultchannel")
    chaincode = Column(String(100), default="nyayavaultcc")
    function_name = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    status = Column(String(50), default="COMMITTED")
    block_number = Column(Integer, nullable=False)
    block_hash = Column(String(64), nullable=True)
    timestamp_utc = Column(DateTime(timezone=True), default=utc_now, index=True)


class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(50), ForeignKey("cases.id"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    requester_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    access_type = Column(String(50), default="VIEW")  # VIEW, PREVIEW, DOWNLOAD
    requested_expiry_days = Column(Integer, default=7)
    status = Column(String(50), default="PENDING", index=True)  # PENDING, APPROVED, REJECTED, EXPIRED
    reviewed_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class AccessGrant(Base):
    __tablename__ = "access_grants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    access_type = Column(String(50), default="VIEW")
    valid_until = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False)
    granted_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    blockchain_tx_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class DigitalSignature(Base):
    __tablename__ = "digital_signatures"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    signer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    signer_name = Column(String(255), nullable=True)
    signer_role = Column(String(50), nullable=False)
    signed_hash = Column(String(64), nullable=False)
    certificate_thumbprint = Column(String(255), nullable=True)
    statement = Column(String(255), nullable=False)
    blockchain_tx_id = Column(String(100), nullable=True)
    signed_at = Column(DateTime(timezone=True), default=utc_now)

    document = relationship("Document", back_populates="signatures")


class IntegrityVerification(Base):
    __tablename__ = "integrity_verifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    version_number = Column(Integer, default=1)
    calculated_hash = Column(String(64), nullable=False)
    registered_hash = Column(String(64), nullable=False)
    blockchain_hash = Column(String(64), nullable=False)
    status = Column(String(50), nullable=False)  # VERIFIED, WARNING, FAILED
    verified_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    verified_at = Column(DateTime(timezone=True), default=utc_now)


class IntegrityIncident(Base):
    __tablename__ = "integrity_incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    incident_number = Column(String(50), unique=True, nullable=False)  # e.g., INC-2026-001
    severity = Column(String(50), default="CRITICAL")  # LOW, MEDIUM, HIGH, CRITICAL
    details = Column(Text, nullable=False)
    status = Column(String(50), default="OPEN")  # OPEN, INVESTIGATING, RESOLVED
    reported_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="INFO")  # INFO, ALERT, ACCESS_REQUEST, VERIFICATION, SIGNATURE
    is_read = Column(Boolean, default=False)
    reference_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class AIJob(Base):
    __tablename__ = "ai_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    job_type = Column(String(50), nullable=False)  # OCR, CLASSIFY, ENTITY_EXTRACT, REDACTION_SUGGEST
    status = Column(String(50), default="COMPLETED")
    extracted_text = Column(Text, nullable=True)
    suggestions = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class RedactedDerivative(Base):
    __tablename__ = "redacted_derivatives"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parent_document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    derived_document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, index=True)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    justification = Column(Text, nullable=False)
    redactions_applied = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    alert_type = Column(String(50), nullable=False, index=True)  # LOGIN_ATTACK, TAMPERING, UNUSUAL_DOWNLOAD, PERMISSION_CHANGE
    severity = Column(String(50), default="HIGH")  # INFO, MEDIUM, HIGH, CRITICAL
    message = Column(String(255), nullable=False)
    details = Column(JSON, nullable=True)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
