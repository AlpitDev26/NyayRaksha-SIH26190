export interface User {
  id: string;
  email: string;
  full_name: string;
  organization_name?: string;
  organization_code?: string;
  roles: string[];
  is_mfa_enabled: boolean;
  last_login_at?: string;
}

export interface CaseAssignment {
  id: string;
  user_id: string;
  user_name?: string;
  role_in_case: string;
  assigned_at: string;
}

export interface Case {
  id: string;
  fir_number?: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  jurisdiction: string;
  lead_investigator_id?: string;
  date_opened: string;
  summary?: string;
  classification: string;
  is_legal_hold: boolean;
  tags?: string;
  document_count: number;
  assignments: CaseAssignment[];
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  sha256_hash: string;
  previous_version_hash: string;
  file_size_bytes: number;
  mime_type: string;
  original_filename?: string;
  change_reason?: string;
  uploader_id: string;
  uploader_name?: string;
  blockchain_tx_id?: string;
  blockchain_status: string;
  virus_scan_status: string;
  created_at: string;
}

export interface Document {
  id: string;
  case_id: string;
  case_title?: string;
  title: string;
  description?: string;
  document_type: string;
  classification: string;
  current_version: number;
  status: string;
  is_legal_hold: boolean;
  is_simulated_tampered?: boolean;
  tags?: string;
  created_by_id: string;
  current_hash?: string;
  blockchain_tx_id?: string;
  blockchain_status?: string;
  created_at: string;
  updated_at: string;
  versions?: DocumentVersion[];
}

export interface DocumentReceipt {
  document_id: string;
  title: string;
  case_id: string;
  version: number;
  sha256_hash: string;
  blockchain_tx_id: string;
  storage_status: string;
  virus_scan_status: string;
  classification: string;
  timestamp_utc: string;
}

export interface VerificationResult {
  document_id: string;
  version_number: number;
  calculated_hash: string;
  registered_hash: string;
  blockchain_hash: string;
  status: "VERIFIED" | "WARNING" | "FAILED";
  blockchain_tx_id?: string;
  verified_at: string;
  message: string;
  is_tampered: boolean;
  incident_number?: string;
}

export interface CustodyEvent {
  id: string;
  case_id: string;
  document_id: string;
  version_number: number;
  action: string;
  actor_id: string;
  actor_name?: string;
  actor_role: string;
  organization_name?: string;
  outcome: string;
  reason?: string;
  hash_reference?: string;
  blockchain_tx_id?: string;
  correlation_id?: string;
  timestamp_utc: string;
}

export interface AccessRequest {
  id: string;
  case_id: string;
  document_id: string;
  document_title?: string;
  requester_id: string;
  requester_name?: string;
  reason: string;
  access_type: string;
  requested_expiry_days: number;
  status: string;
  reviewed_by_id?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export interface DigitalSignature {
  id: string;
  document_id: string;
  version_number: number;
  signer_id: string;
  signer_name?: string;
  signer_role: string;
  signed_hash: string;
  certificate_thumbprint?: string;
  statement: string;
  blockchain_tx_id?: string;
  signed_at: string;
  disclaimer?: string;
}

export interface EntitySuggestion {
  category: string;
  text: string;
  confidence: number;
  is_sensitive: boolean;
}

export interface AISuggestion {
  document_id: string;
  extracted_text_preview: string;
  suggested_classification: string;
  suggested_document_type: string;
  suggested_tags: string[];
  entities: EntitySuggestion[];
  pii_redaction_targets: string[];
  disclaimer: string;
}

export interface AuditEvent {
  id: string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  case_id?: string;
  outcome: string;
  ip_address?: string;
  user_agent?: string;
  correlation_id?: string;
  details?: Record<string, any>;
  timestamp_utc: string;
}

export interface ComplianceStatus {
  encryption_in_transit: boolean;
  encryption_at_rest: boolean;
  mfa_enforced: boolean;
  blockchain_gateway_health: string;
  storage_health: string;
  scanner_health: string;
  pending_anchor_count: number;
  total_immutable_events: number;
  tampering_incident_count: number;
  legal_hold_active_count: number;
  last_audit_sync_utc: string;
}
