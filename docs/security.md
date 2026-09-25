# NyayRaksha — Security Architecture & Compliance Guidelines

**Problem Statement ID:** 26190  
**Title:** Secure Digital Document Management System for Legal and Investigation Documents  

---

## 1. Security Principles

NyayRaksha is designed with the principle of **Defense-in-Depth**, **Zero Trust Internal Architecture**, and **Verifiable Chain of Custody**.

1. **Least Privilege**: Users are granted only the minimum permissions required for their specific role and assigned cases.
2. **Server-Side Enforcement**: All authorization checks (RBAC, Case ACL, Classification, Expiry) are strictly performed on the backend API. UI element hiding is purely for user ergonomics.
3. **Immutability of Evidence**: Original uploaded files are strictly read-only and write-once. Revisions create new versions ($v2, v3$); redactions create derived children.
4. **Separation of Concerns**: Storage, metadata search, and blockchain verification are separated so that compromising one layer does not compromise document integrity or confidentiality.
5. **Fail-Closed Verification**: If blockchain consensus is unreachable, high-risk actions (such as filing in court or external transfer) are restricted until integrity can be confirmed.

---

## 2. Authentication & Session Management

- **Credentials**: Passwords hashed using Argon2id / bcrypt with salted keys. Plaintext passwords are never logged or stored.
- **JWT Tokens**:
  - Access Token: Short-lived (15 minutes).
  - Refresh Token: Rotated on every use (7 days TTL), stored with revocation tracking in database.
  - Delivery: Transmitted via HttpOnly, Secure, SameSite=Lax cookies to prevent XSS exfiltration.
- **Multi-Factor Authentication (MFA)**:
  - Standard RFC 6238 TOTP (Time-based One-Time Password).
  - Enforced for privileged roles: System Administrator, Judge, Auditor.
- **Account Lockout & Cooldown**:
  - Accounts are locked for 15 minutes after 5 consecutive failed login attempts.
  - Generic error messages: *"Invalid credentials provided"*, preventing user enumeration.
- **Rate Limiting**:
  - Sensitive endpoints (`/auth/login`, `/documents/upload`, `/documents/{id}/verify`) are rate-limited via Redis token bucket.

---

## 3. Cryptography & Data Protection

| Component | Mechanism | Standard | Key Management |
| :--- | :--- | :--- | :--- |
| **Data in Transit** | TLS 1.3 / HTTPS | AES-256-GCM / ChaCha20 | CA-issued TLS certificates |
| **Data at Rest (Storage)** | Server-side Encryption | AES-256-GCM envelope | KMS / Private vault key |
| **Document Fingerprints** | Cryptographic Hash | SHA-256 (256-bit digest) | Deterministic byte hashing |
| **Ledger Anchoring** | Permissioned Consensus | Raft / Fabric BFT | MSP Certificates (X.509) |
| **Digital Signatures** | Asymmetric Signing | ECDSA / RSA-4096 | X.509 PKI / Demo metadata |
| **Database Encryption** | Column-level Encryption | AES-256 (Fernet) | TOTP secrets & tokens encrypted |

---

## 4. File Upload & Ingestion Security Controls

1. **MIME Verification**: Inspects magic bytes (file signature) on the server. Does not rely on client-provided `Content-Type` header or file extension.
2. **Path Traversal Prevention**: Original filenames are discarded. Storage object keys are generated as random UUIDv4 identifiers.
3. **Executable Rejection**: Executable binaries (`.exe`, `.sh`, `.bat`, `.dll`, `.elf`, `.msi`) are strictly rejected.
4. **Antivirus Scanning**: Streamed to ClamAV scanner daemon before object storage. Infected files are immediately quarantined with an audit alert.
5. **Size Quota Enforcement**: Maximum file size strictly capped (default: 25MB, configurable).

---

## 5. Role-Based Access Control (RBAC) Matrix

| Role | Upload FIR/Docs | View Assigned Cases | View All Cases | Sign Documents | Request Share | Approve Share | Run Integrity Check | View Full Audit | View File Content |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **System Administrator** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Police / Evidence Officer** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ (Assigned) |
| **Investigating Officer** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ (Own Case) | ✅ | ❌ | ✅ (Assigned) |
| **Forensic Analyst** | ✅ (Reports) | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ (Assigned) |
| **Prosecutor / Legal** | ✅ (Filings) | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ (Assigned) |
| **Court Clerk** | ✅ (Orders) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ (Court cases)|
| **Judge** | ❌ | ✅ | ❌ | ✅ (Orders) | ❌ | ❌ | ✅ | ❌ | ✅ (Court cases)|
| **Auditor / Compliance** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ (Unless explicit)|
| **External Reviewer** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Time-bound only |

---

## 6. Audit & Non-Repudiation

- Application audit log records:
  - Timestamp in UTC
  - Actor ID & Actor Role
  - Action performed
  - Resource Target (Case ID, Document ID, Version)
  - Outcome (SUCCESS / DENIED / FAILED)
  - Client IP & User Agent (truncated/hashed according to privacy policy)
  - Correlation ID
- Chain-of-custody events are committed to the permissioned blockchain ledger, ensuring non-repudiation.
- Audit logs are append-only; database update/delete privileges on audit tables are revoked from application roles.
