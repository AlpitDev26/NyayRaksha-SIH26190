# NyayRaksha — REST API Reference

**Base URL:** `/api/v1`  
**Authentication:** HttpOnly Cookie (`access_token`) or `Authorization: Bearer <token>`  
**OpenAPI Specification:** Available interactively at `/docs` or `/redoc`

---

## 1. Authentication & Identity Endpoints

### `POST /api/v1/auth/login`
- **Description:** Authenticates user credentials. If MFA is required for role (Admin, Judge, Auditor), returns `MFA_REQUIRED` status with a temporary verification token.
- **Request Body:**
  ```json
  {
    "email": "officer@nyayraksha.demo",
    "password": "DemoSecurePassword2026!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "AUTHENTICATED",
    "user": {
      "id": "u-officer-01",
      "email": "officer@nyayraksha.demo",
      "fullName": "Inspector Rajesh Sharma",
      "role": "POLICE_OFFICER",
      "organization": "Delhi Police Crime Branch"
    }
  }
  ```

### `POST /api/v1/auth/mfa/verify`
- **Description:** Completes MFA verification for privileged users using RFC 6238 TOTP.
- **Request Body:**
  ```json
  {
    "tempToken": "<token>",
    "code": "123456"
  }
  ```

### `GET /api/v1/auth/me`
- **Description:** Returns currently authenticated user profile, assigned roles, organization, and active permissions.

### `POST /api/v1/auth/logout`
- **Description:** Invalidates active session and clears authentication cookies.

---

## 2. Case Management Endpoints

### `GET /api/v1/cases`
- **Query Params:** `status`, `priority`, `search`, `page`, `pageSize`
- **Description:** Lists cases accessible to the authenticated user based on role and case assignment.

### `POST /api/v1/cases`
- **Description:** Creates a new legal/investigation case. Generates format `CASE-YYYY-XXXXXX`.
- **Request Body:**
  ```json
  {
    "firNumber": "FIR-2026/894",
    "title": "Suspected Cyber Financial Interception",
    "category": "CYBER_CRIME",
    "priority": "HIGH",
    "jurisdiction": "Special Cyber Cell, New Delhi",
    "leadInvestigatorId": "u-investigator-01",
    "classification": "RESTRICTED",
    "summary": "Unauthorized wire transfers detected across merchant gateways."
  }
  ```

### `GET /api/v1/cases/{case_id}`
- **Description:** Retrieves full case dossier, team members, document manifest, and custody summary.

### `GET /api/v1/cases/{case_id}/timeline`
- **Description:** Retrieves chronological case activity and chain-of-custody timeline.

---

## 3. Document Management & Ingestion

### `POST /api/v1/documents/upload`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `file`: Binary file stream (PDF, DOCX, TXT, PNG, JPG, TIFF)
  - `caseId`: `CASE-2026-000101`
  - `title`: `FIR Final Certified Copy`
  - `documentType`: `FIR`
  - `classification`: `RESTRICTED`
  - `description`: `Certified digital copy received from PS Crime Branch`
  - `tags`: `fir,cyber,financial`
- **Response (201 Created):**
  ```json
  {
    "documentId": "doc-a1b2c3d4",
    "title": "FIR Final Certified Copy",
    "version": 1,
    "sha256Hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "status": "ACTIVE",
    "blockchainTxId": "0x7f88a912e8310cba481...",
    "virusScanStatus": "CLEAN",
    "createdAt": "2026-09-10T09:00:00Z"
  }
  ```

### `GET /api/v1/documents`
- **Query Params:** `caseId`, `type`, `classification`, `search`, `status`, `page`
- **Description:** Searchable document repository.

### `GET /api/v1/documents/{document_id}`
- **Description:** Detailed document record including version list, blockchain references, and custody log.

### `GET /api/v1/documents/{document_id}/preview`
- **Description:** Validates authorization and issues a short-lived presigned URL (300s TTL) with optional watermark headers.

---

## 4. Cryptographic Verification & Custody

### `POST /api/v1/documents/{document_id}/verify`
- **Description:** Recalculates SHA-256 live from encrypted storage, queries registered hash in PostgreSQL and blockchain anchor.
- **Response (200 OK):**
  ```json
  {
    "status": "VERIFIED",
    "documentId": "doc-a1b2c3d4",
    "version": 1,
    "calculatedHash": "e3b0c442...",
    "registeredHash": "e3b0c442...",
    "blockchainHash": "e3b0c442...",
    "blockchainTxId": "0x7f88a912...",
    "verifiedAt": "2026-09-10T09:30:00Z",
    "message": "Document integrity cryptographically verified against permissioned ledger."
  }
  ```

### `GET /api/v1/documents/{document_id}/custody`
- **Description:** Returns the complete, unbroken chain of custody records.

---

## 5. Digital Signatures & Approvals

### `POST /api/v1/documents/{document_id}/sign`
- **Description:** Anchors a digital signature to the document version and blockchain.
- **Request Body:**
  ```json
  {
    "versionId": 1,
    "confirmationStatement": "I am signing version 1 with SHA-256 hash e3b0c442...",
    "certificateThumbprint": "SHA256:CERT-DEMO-JUDGE-01"
  }
  ```

---

## 6. Access Requests & Sharing

### `POST /api/v1/access-requests`
- **Description:** Submits a time-bound access request for restricted or confidential evidence.

### `POST /api/v1/access-requests/{request_id}/approve`
- **Description:** Case owner approves access, generating ACL grant and blockchain access event.

### `POST /api/v1/shares/{share_id}/revoke`
- **Description:** Immediately revokes access grant and anchors revocation on blockchain.

---

## 7. AI, OCR & Redaction

### `POST /api/v1/documents/{document_id}/ai-analyze`
- **Description:** Queues OCR extraction, classification suggestion, and PII detection.

### `POST /api/v1/documents/{document_id}/redaction`
- **Description:** Creates a derived document with redacted PII while leaving the original unaltered.

---

## 8. Audit & Compliance

### `GET /api/v1/audit-events`
- **Description:** Query immutable application audit logs with multi-parameter filtering.

### `GET /api/v1/compliance/checklist`
- **Description:** Real-time health status of encryption, storage, virus scanner, and blockchain gateway.
