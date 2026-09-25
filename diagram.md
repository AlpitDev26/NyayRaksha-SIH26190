# NyayRaksha — System Architecture & Workflows (SIH26190)

This document contains the complete **System Architecture** and **End-to-End User Flow Diagrams** for the *Secure Digital Document Management System for Legal and Investigation Documents* (Team StithPragya).

---

## 1. System Architecture Diagram

```mermaid
flowchart TB
    %% ─── STYLING DEFINITIONS ───
    classDef clientStyle fill:#EFF6FF,stroke:#2563EB,stroke-width:2px,color:#1E3A8A;
    classDef gatewayStyle fill:#F0FDF4,stroke:#059669,stroke-width:2px,color:#064E3B;
    classDef coreStyle fill:#FAF5FF,stroke:#7C3AED,stroke-width:2px,color:#4C1D95;
    classDef aiStyle fill:#FFFBEB,stroke:#D97706,stroke-width:2px,color:#78350F;
    classDef dataStyle fill:#FFFFFF,stroke:#475569,stroke-width:2px,color:#0F172A;
    classDef chainStyle fill:#FEF2F2,stroke:#DC2626,stroke-width:2px,color:#991B1B;
    classDef extStyle fill:#F1F5F9,stroke:#64748B,stroke-width:2px,color:#334155;

    %% ─── 1. CLIENT ACCESS LAYER ───
    subgraph CLIENTS["1. Presentation & Field Access Layer"]
        direction TB
        WEB["🖥️ Web Portal (React.js + MUI)<br/><i>Judges, Prosecutors, Station Admins</i>"]
        MOB["📱 Offline Field App (React Native / Flutter)<br/><i>IOs at Crime Scene (SQLite Encrypted)</i>"]
        CITIZEN["🌐 Citizen Portal (Lightweight Web)<br/><i>Milestone Case Tracking via OTP</i>"]
    end

    %% ─── 2. API & SECURITY GATEWAY ───
    subgraph GATEWAY["2. Security & API Gateway Layer (FastAPI / Node.js)"]
        direction TB
        AUTH["🔐 Zero-Trust Auth & MFA (JWT + TOTP)"]
        RBAC["🛡️ ABAC / RBAC Policy Engine (8 Institutional Roles)"]
        SYNC["🔄 Delta Sync Engine & Conflict Resolver"]
        AUTH --> RBAC --> SYNC
    end

    %% ─── 3. CORE PROCESSING SERVICES ───
    subgraph ENGINES["3. Core Application & Legal Logic Services"]
        direction TB
        DOC_MGR["📄 Case Document Lifecycle Manager"]
        TIMELINE["⏱️ Procedural Timeline & Anomaly Engine"]
        MALKHANA["🏷️ Smart Malkhana Digital Twin (QR Engine)"]
        BSA_CERT["📜 BSA 2023 Sec 63 Court Certificate Generator"]
    end

    %% ─── 4. ASYNC AI & OCR ENGINE ───
    subgraph AI_PIPELINE["4. AI & Background Queue (RabbitMQ / Redis)"]
        direction TB
        QUEUE["📥 Task Queue (Async Workers)"]
        OCR["👁️ OCR Service (EasyOCR / Tesseract)"]
        NLP["🧠 Indian Legal NLP (Entity Extraction & Contradiction)"]
        REDACT["✂️ Dynamic PII Masking Engine"]
        QUEUE --> OCR --> NLP --> REDACT
    end

    %% ─── 5. SECURE STORAGE & PERSISTENCE ───
    subgraph STORAGE["5. Data & Object Storage Layer"]
        direction TB
        POSTGRES[("🐘 PostgreSQL<br/><i>Cases, Metadata, Users, Audit Logs</i>")]
        OBJ_STORE[("☁️ Encrypted Object Store (MinIO / S3)<br/><i>AES-256-GCM Encrypted Evidence Files</i>")]
        LOCAL_CACHE[("💾 Local SQLite (SQLCipher)<br/><i>Encrypted Offline Cache on Device</i>")]
    end

    %% ─── 6. BLOCKCHAIN INTEGRITY LAYER ───
    subgraph LEDGER["6. Permissioned Blockchain & Integrity Layer"]
        direction TB
        CHAIN_ADAPTER["⛓️ Blockchain Gateway Adapter"]
        FABRIC["🏛️ Permissioned Ledger (Hyperledger Fabric / Merkle Vault)<br/><i>Stores: SHA-256 Fingerprint, TxID, Timestamp, Signatures</i>"]
        CHAIN_ADAPTER --> FABRIC
    end

    %% ─── 7. NATIONAL JUSTICE INTEROPERABILITY ───
    subgraph EXTERNAL["7. National Justice Interoperability (ICJS Webhooks)"]
        direction LR
        ECOURTS["⚖️ e-Courts System"]
        EPRISONS["🏢 e-Prisons"]
        DIGILOCKER["📁 DigiLocker"]
        ICJS["🇮🇳 ICJS / CCTNS Core"]
    end

    %% ─── CONNECTIONS ───
    WEB ==> AUTH
    MOB ==> AUTH
    CITIZEN ==> AUTH
    MOB -. Offline Work .-> LOCAL_CACHE

    GATEWAY ==> ENGINES
    ENGINES ==> QUEUE
    ENGINES ==> POSTGRES
    ENGINES ==> OBJ_STORE
    ENGINES ==> CHAIN_ADAPTER

    ENGINES -. Push Webhooks .-> EXTERNAL

    %% ─── APPLY STYLES ───
    class WEB,MOB,CITIZEN clientStyle;
    class AUTH,RBAC,SYNC gatewayStyle;
    class DOC_MGR,TIMELINE,MALKHANA,BSA_CERT coreStyle;
    class QUEUE,OCR,NLP,REDACT aiStyle;
    class POSTGRES,OBJ_STORE,LOCAL_CACHE dataStyle;
    class CHAIN_ADAPTER,FABRIC chainStyle;
    class ECOURTS,EPRISONS,DIGILOCKER,ICJS extStyle;
```

---

## 2. Sequence Diagram: Crime Scene Intake & Offline-to-Online Sync

```mermaid
sequenceDiagram
    autonumber
    actor IO as Investigating Officer (Field)
    participant App as Mobile App (Offline Client)
    participant LocalDB as Local Encrypted SQLite
    participant Gateway as API Gateway
    participant DocService as Document & Audit Service
    participant Storage as AES-256 Object Storage
    participant Ledger as Blockchain Ledger

    Note over IO,LocalDB: PHASE 1: NO INTERNET / FIELD INVESTIGATION
    IO->>App: Record Seizure Memo / Witness Audio / Scene Photo
    App->>App: Compute Local SHA-256 Fingerprint & Device Timestamp
    App->>App: Sign Hash using Officer's Device Key (Ed25519)
    App->>LocalDB: Store Encrypted Record in Local Sync Journal

    Note over IO,Gateway: PHASE 2: CONNECTIVITY RESTORED (AUTO-SYNC)
    App->>Gateway: Detect Network & Initiate POST /api/v1/sync/delta (JWT Auth)
    Gateway->>Gateway: Verify Officer Identity & Device Fingerprint
    Gateway->>DocService: Stream Queued Evidence Payloads
    DocService->>Storage: Encrypt & Store Binary Files (AES-256-GCM)
    DocService->>Ledger: Commit Transaction (DocID, Version, SHA-256, Offline Timestamp, Officer Signature)
    Ledger-->>DocService: Return Block Number & TxID
    DocService-->>App: Sync Acknowledged (Status: ANCHORED)
    App->>LocalDB: Mark Local Journal Records as "SYNCED"
    App-->>IO: Green Indicator: "All Field Records Sealed & Anchored"
```

---

## 3. Sequence Diagram: Document Upload, AI OCR & Blockchain Anchoring

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Evidence Officer / Station IO
    participant Web as Web Dashboard
    participant API as Document Service
    participant Scanner as ClamAV Antivirus
    participant S3 as Encrypted Object Store
    participant DB as PostgreSQL Metadata
    participant AI as AI Worker (OCR & NLP)
    participant Ledger as Permissioned Blockchain

    Officer->>Web: Select Case, Document Type (FIR / Charge Sheet) & Upload File
    Web->>API: POST /api/v1/documents/upload (Multipart)
    API->>Scanner: Stream File to Antivirus Scanner
    Scanner-->>API: Clean / Verified Safe
    API->>API: Generate SHA-256 Hash & Encrypt Payload (AES-256)
    API->>S3: Write Encrypted Blob to Private Vault
    API->>DB: Save Document Record (Status: PROCESSING)
    
    par Async AI Intelligence Processing
        API->>AI: Dispatch OCR & Analysis Task
        AI->>AI: Extract Text (EasyOCR / Tesseract)
        AI->>AI: Extract Entities (Names, Sections, Dates) & Detect Timeline Anomalies
        AI->>DB: Store Extracted Metadata & PII Masking Coordinates
    and Cryptographic Anchoring
        API->>Ledger: Submit CreateDocumentAnchor(DocID, SHA-256, OfficerID, Timestamp)
        Ledger-->>API: Ledger Receipt (TxID, Block #, Immutable Timestamp)
        API->>DB: Update Status: ACTIVE with Blockchain Proof
    end

    API-->>Web: 201 Created (Instant Cryptographic Proof & Preview)
    Web-->>Officer: Show Document Badge: "Sealed on Blockchain"
```

---

## 4. Sequence Diagram: Judicial Integrity Verification & Tampering Alert

```mermaid
sequenceDiagram
    autonumber
    actor Judge as Hon'ble Judge / Magistrate
    participant Web as Judicial Portal
    participant API as Integrity & Case Service
    participant S3 as Encrypted Object Storage
    participant DB as PostgreSQL Record
    participant Ledger as Blockchain Ledger
    actor Admin as System Auditor / Alert System

    Judge->>Web: Open Case Docket & Click "Verify Integrity"
    Web->>API: POST /api/v1/documents/{doc_id}/verify
    API->>S3: Fetch Encrypted Document Stream
    API->>API: Compute Live SHA-256 Hash on Current Stored File
    API->>DB: Retrieve Registered Database Hash & Version History
    API->>Ledger: Query Ledger State: VerifyDocumentAnchor(DocID, Version)
    Ledger-->>API: Return Genesis Anchored Hash & Original Timestamp

    alt LIVE HASH == DB HASH == LEDGER HASH (UNTOUCHED)
        API-->>Web: 200 STATUS: VERIFIED (Green Badge)
        Web-->>Judge: Display Chain-of-Custody Timeline & BSA Sec 63 Certificate Download
    else HASH MISMATCH DETECTED (TAMPERED FILE)
        API->>DB: Lock Document Downloads & Flag INTEGRITY_INCIDENT
        API->>Admin: Trigger Critical Red Alert (WebSocket / Email to Vigilance Cell)
        API-->>Web: 200 STATUS: INTEGRITY_BREACH (Red Alert)
        Web-->>Judge: Warning: "Document Hash Discrepancy! File altered after original anchoring!"
    end
```

---

## 5. Sequence Diagram: Citizen Case Tracking (Zero-Trust Privacy)

```mermaid
sequenceDiagram
    autonumber
    actor Victim as Citizen / Complainant
    participant Portal as Citizen Web Portal
    participant API as Public Gateway Service
    participant DB as Cases Database

    Victim->>Portal: Enter Case Number / e-FIR Number + Mobile Number
    Portal->>API: POST /api/v1/citizen/request-otp
    API->>Victim: Send 6-Digit OTP via SMS
    Victim->>Portal: Submit OTP
    Portal->>API: POST /api/v1/citizen/verify-otp
    API->>DB: Lookup Case Status & Milestones
    Note over API,DB: Filter out private names, witness records, and confidential notes
    API-->>Portal: Return Sanitized Milestone Pipeline
    Portal-->>Victim: Display Visual Timeline:<br/>✅ FIR Registered (12-Oct)<br/>✅ Forensic Sample Sent to CFSL (15-Oct)<br/>⏳ Charge Sheet Filing (Under Process)
```
