# NyayaVault — Comprehensive Threat Model

**Framework:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  
**Standard:** NIST SP 800-53 / ISO 27001  
**Problem Statement ID:** 26190  

---

## Threat Matrix & Mitigation Controls

### 1. Compromised User Credentials
- **Threat Vector**: Credential stuffing, phishing of investigating officers or court clerks, password reuse.
- **Impact**: Unauthorized access to sensitive case files, witness statements, and sealed records.
- **Mitigation Controls**:
  - Mandatory TOTP Multi-Factor Authentication (MFA) for privileged users (Admins, Judges, Auditors).
  - Argon2id / bcrypt password hashing with unique random salts.
  - Automatic account lockout after 5 consecutive failures with 15-minute cooldown.
  - Short-lived JWT access tokens (15 minutes).
  - Anomaly detection logging for unusual login locations or IP addresses.
  - Rate limiting on authentication routes.

### 2. Malicious Insider Misuse
- **Threat Vector**: A corrupt police officer or compromised clerk attempting to modify an FIR, substitute evidence photos, or delete records.
- **Impact**: Legal sabotage, evidence suppression, compromised judicial integrity.
- **Mitigation Controls**:
  - Immutability: Uploaded original files cannot be edited or overwritten; all edits spawn new numbered versions.
  - Dual authorization for sealed documents.
  - Permissioned blockchain ledger anchors SHA-256 hashes of all versions and custody transfers.
  - Real-time audit alerts trigger on unauthorized access attempts.
  - Four-eyes principle: Redactions require independent reviewer sign-off.

### 3. Malicious Uploads & Malware Ingestion
- **Threat Vector**: Uploading trojan horse files disguised as PDF reports or exploit payloads in DOCX/TIFF files.
- **Impact**: Remote code execution on backend servers or client machines upon previewing evidence.
- **Mitigation Controls**:
  - Server-side magic-byte inspection (disregarding client MIME headers or spoofed file extensions).
  - Rejection of all executable binaries, scripts, and unknown formats.
  - In-stream ClamAV virus scanning before storage persistence.
  - Files stored outside web root with random UUIDs.
  - Previews rendered in sandboxed browser frames with strict Content Security Policy (CSP).

### 4. Direct Storage / Database Tampering
- **Threat Vector**: Rogue sysadmin or external attacker with direct access to database or S3 bucket modifying the file or database hash column.
- **Impact**: Evidence falsification.
- **Mitigation Controls**:
  - Cryptographic decoupling: Even if the database hash column is altered, the permissioned blockchain ledger retains the immutable hash proof.
  - Live Verification Engine: When "Verify Integrity" runs, it recalculates the SHA-256 from the file and checks against the blockchain ledger.
  - Automatic incident triggering: A mismatch flags the document, locks downloads, alerts the case owner, and files an `IntegrityIncident` ticket.

### 5. Ransomware Attack
- **Threat Vector**: Ransomware encrypts the local object storage or database volume.
- **Impact**: Loss of evidence availability.
- **Mitigation Controls**:
  - S3 Object Lock / WORM (Write Once, Read Many) compliance policies.
  - Versioned storage buckets with versioning retention enabled.
  - Independent offline backups with cryptographic verification.
  - Blockchain ledger distributed across peer organizations (Police Dept, High Court, Forensics Lab) ensures state recovery verification.

### 6. Database Breach & Data Exfiltration
- **Threat Vector**: SQL injection or raw database dump leakage.
- **Impact**: Exposure of case metadata and credentials.
- **Mitigation Controls**:
  - Parameterized ORM queries exclusively (SQLAlchemy). No raw string SQL concatenation.
  - Storage files are not in the database; they are encrypted objects in a separate private vault.
  - TOTP secrets, tokens, and sensitive columns encrypted with AES-256.
  - Password hashes use Argon2id/bcrypt.

### 7. Storage Bucket Exposure
- **Threat Vector**: Misconfigured public bucket or leaked S3 access credentials.
- **Impact**: Uncontrolled public download of legal evidence.
- **Mitigation Controls**:
  - All buckets are private (`anonymous set none` in MinIO/S3 policy).
  - All access is mediated via backend API.
  - Temporary presigned URLs are issued ONLY after backend validates user role, case assignment, and classification.
  - Presigned URL lifetime capped at 300 seconds (5 minutes).
  - Dynamic watermarking stamped on downloaded documents displaying requester ID, case ID, and UTC timestamp.

### 8. Blockchain Gateway / Network Outage
- **Threat Vector**: Temporary network partition, peer node crash, or Fabric gateway latency.
- **Impact**: Transactions cannot be committed immediately.
- **Mitigation Controls**:
  - Graceful degradation: The system marks the document as `PENDING_BLOCKCHAIN_ANCHOR`.
  - Asynchronous background retry queue with exponential backoff.
  - High-risk actions (filing in court, external transfer) are paused until the anchor is confirmed.
  - UI displays yellow warning badge showing pending anchor status transparently.

### 9. Unauthorized Sharing & Expiry Bypass
- **Threat Vector**: An external expert retaining access indefinitely or re-sharing credentials.
- **Impact**: Leak of sealed investigation materials to unauthorized third parties.
- **Mitigation Controls**:
  - Time-bound access grants with mandatory expiration date.
  - Instant revocation mechanism that commits a `REVOKED` state on both database and blockchain ledger.
  - Dynamic access validation: Backend re-evaluates expiry on every preview or download request.
  - External reviewer accounts restricted to read-only browser preview (no direct file downloads).
