# NyayRaksha — Permissioned Blockchain Architecture

**Network:** Hyperledger Fabric 2.5 (or Mock Fabric Ledger in local demo mode)  
**Channel:** `nyayavaultchannel`  
**Smart Contract (Chaincode):** `nyayavaultcc`  
**Problem Statement ID:** 26190  

---

## 1. Principles of Permissioned Ledger Usage

Public blockchains (such as Ethereum or Bitcoin) require gas fees, expose transaction metadata publicly, and have variable latency. NyayRaksha utilizes a **Permissioned Distributed Ledger** (Hyperledger Fabric) where all participating peer organizations have cryptographically authenticated identities (Membership Service Providers - MSPs):

- **Org1 (Law Enforcement / Police MSP)**: Endorses FIR uploads, seizure memos, initial evidence custody.
- **Org2 (Judiciary / Court MSP)**: Endorses court filings, judicial orders, judgments, bail orders.
- **Org3 (Forensics & Prosecution MSP)**: Endorses forensic reports, charge sheets, expert witness opinions.

---

## 2. Blockchain Data Models

### 2.1 Document Anchor (`DocumentAnchor`)
Anchors the cryptographic fingerprint and provenance of an ingested document.
```json
{
  "documentId": "doc-uuid-string",
  "versionId": 1,
  "caseId": "CASE-2026-000101",
  "documentType": "FIR",
  "classification": "RESTRICTED",
  "sha256Hash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
  "previousVersionHash": "GENESIS",
  "storageObjectReferenceHash": "b2c3d4...",
  "uploadedBy": "u-officer-01",
  "organizationId": "PoliceMSP",
  "timestampUtc": "2026-09-10T09:15:32Z",
  "eventType": "DOCUMENT_CREATED",
  "signatureReferenceHash": "",
  "correlationId": "corr-99210-abc",
  "status": "ACTIVE"
}
```

### 2.2 Custody Event Anchor (`CustodyEventAnchor`)
Records every interaction and custodial transfer in an append-only chain.
```json
{
  "eventId": "evt-custody-10492",
  "documentId": "doc-uuid-string",
  "versionId": 1,
  "caseId": "CASE-2026-000101",
  "action": "TRANSFERRED",
  "actorId": "u-officer-01",
  "actorRole": "POLICE_OFFICER",
  "organizationId": "PoliceMSP",
  "timestampUtc": "2026-09-10T10:00:00Z",
  "outcome": "SUCCESS",
  "reasonHash": "c5d6e7...",
  "documentHash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
  "correlationId": "corr-99211-xyz"
}
```

### 2.3 Signature Proof Anchor (`SignatureAnchor`)
Binds an officer's, prosecutor's, or judge's digital signature to a specific document hash.
```json
{
  "signatureId": "sig-88391",
  "documentId": "doc-uuid-string",
  "versionId": 1,
  "signerId": "u-judge-01",
  "signerRole": "JUDGE",
  "signedHash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
  "certificateKeyThumb": "SHA256:JUDGE-SUPREME-COURT-CA-992",
  "timestampUtc": "2026-09-10T11:30:00Z"
}
```

---

## 3. Mock Fabric Ledger Implementation

For immediate local demonstration without starting a 10-container Fabric test network, NyayRaksha implements `MockBlockchainAdapter`:
- **Deterministic State Store**: Simulates Fabric World State (Key-Value) and Block Store.
- **Cryptographic Hashes**: Generates real SHA-256 block hashes, Merkle roots, and transaction IDs (e.g. `0x3a9f...`).
- **Simulated Latency & Consensus**: Accurately simulates Fabric endorsement latency and transaction commitment events.
- **Fail-Closed Verification**: Accurately returns `TAMPERED` if the file hash diverges from the ledger state.
