# NyayaVault — Technical Architecture & System Design

**Problem Statement ID:** 26190  
**Title:** Secure Digital Document Management System for Legal and Investigation Documents  
**Tagline:** *“Tamper-evident legal and investigation document management with verifiable chain of custody.”*

---

## 1. Architectural Philosophy: The Hybrid Model

Legal and forensic systems handle massive, highly sensitive documents: First Information Reports (FIRs), forensic disk images, audio/video depositions, autopsy reports, and sealed court judgments. 

Storing large binary files directly on a blockchain causes ledger bloat, severe latency, high operational cost, and irreversible confidentiality hazards (since data on an immutable ledger cannot be redacted or deleted under data privacy regulations).

**NyayaVault implements a strict Hybrid Three-Tier Architecture:**

```
+-----------------------------------------------------------------------------+
|                                CLIENT TIER                                  |
|         Next.js 14 App Router + TypeScript + Tailwind CSS + Lucide          |
|    Accessible, Responsive, Role-Tailored Dashboards & Verification Tools    |
+-------------------------------------+---------------------------------------+
                                      | HTTPS / REST (JSON + Form-Data)
                                      v
+-----------------------------------------------------------------------------+
|                             API & SERVICE TIER                              |
|                   FastAPI (Python 3.11) + Pydantic v2                       |
|   RBAC + Case ACL | AES-256 Engine | Scanner | AI Suggestions | Auth Engine |
+----------+--------------------------+------------------------------+--------+
           |                          |                              |
           v                          v                              v
+----------------------+   +----------------------+   +-----------------------+
|    STORAGE TIER      |   |    DATABASE TIER     |   |     LEDGER TIER       |
| Private Object Store |   |  PostgreSQL / SQLite |   |  Hyperledger Fabric   |
| (MinIO / AWS S3 /    |   |  Read models, ACLs,  |   |  Cryptographic hashes,|
| AES-256 Local Disk)  |   |  metadata, search,   |   |  version links,       |
| Encrypted at rest.   |   |  audit log entries,  |   |  custody anchors,     |
| Presigned short TTL. |   |  incident tickets.   |   |  signature events.    |
+----------------------+   +----------------------+   +-----------------------+
```

1. **Private Object Storage (Storage Tier)**:  
   Actual original document files are encrypted at rest using AES-256-GCM. Objects are given non-predictable UUID keys. Files are never publicly exposed. Downloads and previews require backend authorization and return short-lived signed URLs (default TTL: 300 seconds).

2. **Relational Database (Search & Metadata Tier)**:  
   PostgreSQL 16 (with zero-dependency local SQLite fallback) stores structured case metadata, document titles, categories, case assignments, access control policies, notifications, and indexed read models for millisecond search queries.

3. **Permissioned Blockchain (Integrity Tier)**:  
   Hyperledger Fabric (with an in-memory/file-backed Mock Ledger adapter for instant local demo) stores only cryptographic proofs:
   - SHA-256 document fingerprints
   - Version linking (`previousVersionHash`)
   - Chain-of-custody event anchors (actions, pseudonymous actor ID, timestamp, outcome)
   - Digital signature references
   - Access grants and revocations

---

## 2. Core Subsystems

### 2.1 Identity, Access, and RBAC Engine
- **8 Pre-configured Institutional Roles**:
  - System Administrator
  - Police Officer / Evidence Officer
  - Investigating Officer
  - Forensic Analyst
  - Prosecutor / Legal Officer
  - Court Clerk
  - Judge
  - Auditor / Compliance Officer
- **Multi-Factor Authentication (MFA)**: TOTP enforcement for privileged roles (Administrator, Judge, Auditor).
- **Dual-Layer Authorization**:
  - *Layer 1 (Role RBAC)*: Action permission (e.g. only Judges/Prosecutors can sign; only Officers can upload evidence).
  - *Layer 2 (Case & Document ACL)*: Case assignment checks, document classification restrictions (Public, Internal, Confidential, Restricted, Sealed), and time-bound share grants.

### 2.2 Ingestion & Cryptographic Anchoring Pipeline
1. Multi-part file upload received by API.
2. Server-side MIME validation and file size check (magic byte detection, rejecting executables).
3. In-stream antivirus scan via ClamAV adapter (or local heuristic engine).
4. Immediate calculation of SHA-256 cryptographic digest.
5. Server-side encryption (AES-256-GCM) and storage in private bucket/vault with random UUID key.
6. Record creation in PostgreSQL with status `PROCESSING`.
7. Blockchain transaction submission with `DocumentAnchor`.
8. Status transition to `ACTIVE` upon ledger consensus. If ledger is temporarily unreachable, document transitions to `PENDING_BLOCKCHAIN_ANCHOR` with high-risk actions locked until background reconciliation completes.
9. Custody event logged and anchored.

### 2.3 Verification & Incident Engine
- Computes real-time SHA-256 of the stored encrypted document stream.
- Queries PostgreSQL registered hash and blockchain ledger state.
- **Outcomes**:
  - `VERIFIED`: SHA-256 matches database and blockchain state.
  - `WARNING`: Hash matches database, but blockchain anchor is pending or ledger unreachable.
  - `FAILED`: Hash mismatch detected! Document has been altered or tampered with.
- **Incident Response Workflow**:
  - Immediately locks downloads and external sharing.
  - Emits a high-severity security alert.
  - Generates an `IntegrityIncident` ticket.
  - Notifies System Administrator and Case Owner.
  - Preserves both original records for digital forensics.

### 2.4 AI-Assisted OCR, Classification, and Redaction
- Asynchronous OCR extraction for images and scanned documents.
- Automatic entity extraction suggestions: Person names, phone numbers, identification numbers, locations, dates.
- AI classification recommendations.
- **Mandatory Human-in-the-Loop Principle**:
  - All AI outputs are labeled: *"AI-generated suggestion — human review required"*.
  - Suggestions are only advisory; human reviewer must accept/modify before finalizing.
  - Redaction creates a **Derived Document** linked to parent version. The original evidence remains completely unchanged and immutable.

---

## 3. High Availability and Scalability

- **Stateless API Tier**: FastAPI instances run behind an Nginx reverse proxy with load balancing.
- **Asynchronous Task Queue**: Celery / background worker with Redis handles time-intensive tasks (virus scanning, OCR, blockchain retry, email alerts).
- **Database Partitioning**: Audit and custody logs are partitioned by timestamp/case ID for optimized indexing and compliance retention.
