# NyayaVault — 5-Minute Hackathon Demonstration Script

**Problem Statement ID:** 26190  
**Title:** Secure Digital Document Management System for Legal and Investigation Documents  
**Target Duration:** 5 minutes  

---

## Pre-requisites & Quick Start
1. Ensure the platform is running:
   - Backend on `http://localhost:8000`
   - Frontend on `http://localhost:3000`
2. Notice the top **DEMO BANNER** with the one-click **"Role Switcher"** for instant evaluator testing without manual credential re-typing.

---

## Minute-by-Minute Demonstration Flow

### Minute 1: Authentication & Role-Specific Dashboard
- **Step 1:** Open `http://localhost:3000/login`.
- **Step 2:** Click the quick-fill button for **Police / Evidence Officer** (`officer@nyayavault.demo`).
- **Step 3:** Click **Sign In**.
- **Explanation to Judges:**  
  *“NyayaVault implements zero-trust RBAC across 8 legal and enforcement roles. Notice that Inspector Sharma's dashboard surfaces only assigned cases, pending evidence custody handovers, and real-time ledger health status.”*

---

### Minute 2: Secure Evidence Upload & Blockchain Anchoring
- **Step 4:** From the dashboard, click **"Upload Document"** (`/documents/upload`).
- **Step 5:** Select Case: `CASE-2026-000101 — Missing Person Investigation`.
- **Step 6:** Select Document Type: `FIR`, Classification: `RESTRICTED`.
- **Step 7:** Choose any sample PDF or image, enter Title: `FIR Supplementary Statement No. 3`, and click **Upload & Anchor**.
- **Step 8:** Observe the **Live Cryptographic Ingestion Receipt**:
  - SHA-256 fingerprint generated in-memory.
  - ClamAV malware scan status: `CLEAN`.
  - AES-256-GCM encryption at rest in private storage.
  - Hyperledger Fabric Transaction ID generated: `0x8f19b2...`.
- **Explanation to Judges:**  
  *“Crucially, as per the hybrid architectural principle, the file content is NEVER placed on the blockchain. Only the SHA-256 fingerprint and custody event are anchored, guaranteeing privacy and scalability while establishing non-repudiation.”*

---

### Minute 3: Cryptographic Integrity Verification (Success Flow)
- **Step 9:** Click the **"Verify Integrity"** button on the receipt or navigate to `/documents`.
- **Step 10:** Click **Verify Integrity**.
- **Step 11:** The system recalculates the SHA-256 hash live from private storage, compares it against the database and the permissioned ledger, and returns a glowing green **VERIFIED** badge.
- **Explanation to Judges:**  
  *“Any court clerk, defense lawyer, or judge can independently verify that not a single bit of the evidence file has altered since police intake.”*

---

### Minute 4: Simulated Evidence Tampering & Incident Response
- **Step 12:** In the Document Repository, locate the document flagged:  
  `[DEMO-TAMPERED] Bank Account Summary - Case 102`.
- **Step 13:** Click **"Verify Integrity"**.
- **Step 14:** Observe the instant **RED ALERT — INTEGRITY FAILURE**:
  - Live calculated hash differs from the blockchain-anchored hash.
  - Document is automatically locked (downloads and sharing disabled).
  - An `IntegrityIncident` ticket is created automatically.
  - Case investigator and Security Admin receive high-priority alerts.
- **Explanation to Judges:**  
  *“If an insider or attacker with root database access attempts to alter an evidence file or spoof the database table, NyayaVault's ledger cross-verification instantly catches the anomaly and freezes the asset.”*

---

### Minute 5: Chain of Custody, Digital Signatures & Compliance Audit
- **Step 15:** Click **"Chain of Custody"** on any document or `/cases/CASE-2026-000101/timeline`.
- **Step 16:** Walk the judges through the chronological visual timeline showing:
  `CREATED` ➔ `HASHED` ➔ `SCANNED` ➔ `STORED` ➔ `TRANSFERRED` ➔ `VIEWED`.
- **Step 17:** Switch role in top bar to **Judge** (`judge@nyayavault.demo`).
- **Step 18:** Open a pending Court Order, review the SHA-256 confirmation prompt, and click **"Sign Document"** to anchor judicial sign-off on the ledger.
- **Step 19:** Switch role to **Auditor** (`auditor@nyayavault.demo`) and open `/audit` & `/compliance`. Show the immutable system audit trail and live health checklist.
- **Closing Statement:**  
  *“NyayaVault delivers a verifiable, tamper-evident judicial backbone ready for Indian law enforcement, courts, and forensic laboratories.”*
