# NyayRaksha Blockchain Adapter & Chaincode

Problem Statement ID: **26190**  
Tagline: *“Tamper-evident legal and investigation document management with verifiable chain of custody.”*

## Architectural Principle
**No document contents or plaintext PII are ever stored on the blockchain.**  
Only cryptographic SHA-256 integrity proofs, version anchors, custody events, digital signature references, and access audit records are committed to the permissioned distributed ledger.

## Hyperledger Fabric Smart Contract (`nyayavaultcc`)

### Core Business Functions
1. `CreateDocumentRecord`: Anchors the initial document SHA-256 fingerprint, version 1, case reference, and storage object reference hash.
2. `CreateDocumentVersion`: Anchors revision $N+1$ with a cryptographic link to `previousVersionHash`.
3. `RecordCustodyEvent`: Commits an append-only custody event (UPLOADED, HASHED, STORED, VIEWED, DOWNLOADED, SHARED, TRANSFERRED, SIGNED, VERIFIED, etc.).
4. `RecordAccessEvent`: Records time-bound document access authorizations.
5. `RevokeShare`: Commits an explicit revocation of access.
6. `RecordSignatureEvent`: Binds a digital signature hash, version reference, and signer identity to the ledger.
7. `VerifyDocumentHash`: Queries the immutable state to verify whether a calculated SHA-256 hash matches the anchored proof.

## Dual-Mode Operation
- **MOCK MODE (`BLOCKCHAIN_MODE=mock`)**:  
  Runs a thread-safe in-memory and database-backed ledger simulator. Generates deterministic SHA-256 transaction IDs, block numbers, state trees, and full audit query support. Requires zero external network overhead — ideal for rapid local development and hackathon demonstrations.
- **FABRIC GATEWAY MODE (`BLOCKCHAIN_MODE=fabric`)**:  
  Connects to a live Hyperledger Fabric network via the Fabric Gateway SDK using gRPC and TLS certificates configured in `.env`.
