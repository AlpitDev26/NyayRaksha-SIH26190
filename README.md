# NyayRaksha — Secure Digital Document Management System

[![Problem Statement ID](https://img.shields.io/badge/SIH%202026-Problem%2026190-0A2540?style=for-the-badge)](https://sih.gov.in)
[![Security Standard](https://img.shields.io/badge/Security-AES--256--GCM%20%7C%20SHA--256%20%7C%20RBAC-059669?style=for-the-badge)](docs/security.md)
[![Blockchain Architecture](https://img.shields.io/badge/Ledger-Hyperledger%20Fabric%20%7C%20Local%20Simulator-2563EB?style=for-the-badge)](docs/blockchain.md)

> **“Tamper-evident legal and investigation document management with verifiable chain of custody.”**

NyayRaksha is an enterprise-grade, defense-in-depth digital document vault engineered for law enforcement agencies (Police, Special Investigation Teams), judicial magistrates, forensic investigators, and public prosecutors under the Inter-operable Criminal Justice System (ICJS) framework and Bharatiya Sakshya Adhiniyam, 2023 (BSA 2023).

It combines **AES-256-GCM encrypted off-chain object storage**, **PostgreSQL relational search & audit indices**, and **permissioned distributed ledger anchoring** to deliver an uncompromised chain of custody and instant mathematical proof against evidence tampering.

---

## 🏛️ Key System Capabilities

- **Hybrid Storage Architecture**: Binary evidence files are encrypted at rest with authenticated AES-256-GCM and stored off-chain in private storage (MinIO S3 or local vault). Only cryptographic SHA-256 fingerprints, version lineage links, and custody actions are anchored to the distributed ledger.
- **8 Institutional Roles with Granular RBAC**: System Administrator, Police / Evidence Officer, Investigating Officer, Forensic Analyst, Prosecutor, Court Clerk, Judge, and Compliance Auditor.
- **Zero-Trust Multi-Factor Authentication (MFA)**: RFC 6238 TOTP enforcement with HttpOnly secure session cookies.
- **Real-Time 3-Way Cryptographic Verification**: Recalculates file hashes on demand across Live Disk Bytes, PostgreSQL Registry, and Distributed Ledger State to detect bit-level tampering, with automated incident ticketing (`INCIDENT_LOCKED`).
- **Tamper-Evident Chain of Custody**: Complete event lifecycle recording (`CREATED`, `HASHED`, `STORED`, `VIEWED`, `DOWNLOADED`, `TRANSFERRED`, `SIGNED`, `VERIFIED`).
- **AI-Assisted Privacy Redaction Prototype**: Rule-based heuristic extraction of Indian PII (Aadhaar, PAN, contact numbers) and legal statutory tags to generate sanitized court-ready exhibits while preserving original evidence immutability.
- **Section 63 BSA 2023 Admissibility Certificates**: Automated electronic evidence certification ready for courtroom presentation.

---

## 🔍 Technology Reality & Architecture Transparency

### 1. Blockchain Ledger: Demo Mode vs. Production Architecture
* **Demo / Local Execution Mode (`BLOCKCHAIN_MODE=mock`)**:  
  Runs a thread-safe, deterministic cryptographic ledger simulator inside the backend engine. It generates authentic SHA-256 transaction IDs, block sequences, Merkle root states, and enforces append-only custody logic without requiring high-memory multi-peer virtual machines.
* **Production Enterprise Architecture (`BLOCKCHAIN_MODE=fabric`)**:  
  Connects via gRPC and TLS certificates to a live multi-organization Hyperledger Fabric 2.5 channel using the native Go chaincode (`packages/blockchain-adapter/chaincode/nyayavault.go`).

### 2. AI Component: Transparent Implementation
* **Current Implementation**: Fast, deterministic, regex/heuristic rule-based entity extraction and PII redaction prototype (`AIService`). Safely identifies Aadhaar numbers, PAN cards, phone numbers, email addresses, and Indian legal section citations (IPC, CrPC, BNSS, BSA) on-premise without cloud data leakage.
* **Production Roadmap**: Integration with specialized on-premise Indian Legal BERT / SpaCy NLP models for unstructured witness statements.

---

## 📐 End-to-End System Security Workflow

```
Evidence File
      │
      ▼
[In-Stream Malware Scan (ClamAV / Local Heuristic)]
      │ (Clean)
      ▼
[SHA-256 Bitstream Fingerprint Computed]
      │
      ▼
[AES-256-GCM Authenticated Envelope Encryption]
      │
      ├──> [Encrypted File Payload stored in Off-Chain Vault (MinIO/Local)]
      │
      ├──> [Relational Metadata & Audit Indices stored in PostgreSQL]
      │
      └──> [Cryptographic Hash Anchor & Custody Event committed to Blockchain]
      │
      ▼
[Continuous / On-Demand Verification]
      │
      ├──> Live Recomputed Hash == Registry Hash == Blockchain Hash ──> [Status: VERIFIED]
      │
      └──> Discrepancy Detected (Tampered File)
                 │
                 ├──> Status Changed to INCIDENT_LOCKED
                 ├──> File Downloads & Exports Quarantined
                 ├──> Formal Integrity Incident Docket Generated
                 └──> Immutable Tamper Custody Event Logged
```

---

## 👥 Pre-Seeded Institutional Demo Accounts

All demo accounts share the demonstration password: **`DemoSecurePassword2026!`**

| Role | Email | Official Name | Jurisdiction / Department |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@nyayraksha.demo` | Alok Verma | Ministry of Home Affairs / Central IT |
| **Police / Evidence Officer** | `officer@nyayraksha.demo` | Insp. Rajesh Sharma | Delhi Police Central Crime Branch |
| **Investigating Officer** | `investigator@nyayraksha.demo` | ACP Priya Nair | Cyber Crime Special Cell |
| **Forensic Analyst** | `forensic@nyayraksha.demo` | Dr. Anand Swaminathan | Central Forensic Science Laboratory (CFSL) |
| **Prosecutor / Legal** | `prosecutor@nyayraksha.demo` | Adv. Meera Joshi | Directorate of Public Prosecutions |
| **Court Clerk** | `clerk@nyayraksha.demo` | R. K. Gupta | High Court Registry, Courtroom 4 |
| **Judge** | `judge@nyayraksha.demo` | Justice S. K. Roy | Hon'ble High Court Bench |
| **Auditor / Compliance** | `auditor@nyayraksha.demo` | Sunita Deshmukh | National Audit & Oversight Directorate |

*(Note: In demo mode, standard TOTP challenge default is `123456`)*

---

## 🚀 Quick Start Guide

### Option A: Docker Compose (Recommended)

Run the full containerized stack (PostgreSQL 16, Redis 7, MinIO S3, ClamAV Antivirus, FastAPI Backend, Next.js Frontend):

```bash
docker compose up -d --build
```
* **Web Application:** `http://localhost:3000`
* **FastAPI Interactive Docs:** `http://localhost:8000/docs`
* **MinIO Storage Console:** `http://localhost:9001` (User: `minioadmin` / Pass: `minioadmin`)

---

### Option B: Local Developer Launch (Zero-Docker Fallback)

1. **Start the FastAPI Backend (Port 8000):**
   ```bash
   cd apps/api
   pip install -r requirements.txt
   python main.py
   ```

2. **Start the Next.js Frontend (Port 3000):**
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

---

## 🛡️ Perfect 5-Minute Demonstration Sequence for Judges

1. **Scene 1 — Role-Based Access:** Log in or use the header role switcher as **Investigating Officer (ACP Priya Nair)**.
2. **Scene 2 — Case Management:** Open Case Docket `CASE-2026-001` (State vs. Cyber Syndicate).
3. **Scene 3 — Evidence Ingestion:** Go to **Evidence Ingestion Vault**, upload a document. Observe malware scanning $\rightarrow$ SHA-256 computation $\rightarrow$ AES-256-GCM encryption $\rightarrow$ blockchain transaction generation.
4. **Scene 4 — Live Verification:** Open the uploaded document and click **Verify Integrity Live**. Observe instant 3-way hash matching and Section 63 BSA compliance seal.
5. **Scene 5 — Tamper Detection & Auto-Lock (The "WOW" Factor):** Navigate to Electronic Case Files and open `DOC-005` (`[DEMO-TAMPERED] Bank Account Transaction Ledger`). Click **Verify Integrity Live**. Observe:
   - Live Calculated Hash $\neq$ Blockchain Ledger Hash
   - Status instantly shifts to **`INCIDENT_LOCKED`**
   - Incident ticket generated and downloads quarantined
6. **Scene 6 — Chain of Custody & Certificate:** Open **Chain of Custody Ledger** to inspect the chronological audit trail and generate a printable Section 65B/63 evidence certificate.
7. **Scene 7 — Statutory Oversight:** Visit **Statutory Compliance (BNSS)** to view live encryption status, node telemetry, and audit counts.
