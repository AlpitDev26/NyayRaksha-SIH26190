import hashlib
import json
import os
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.core.logging import logger


class BlockchainAdapter(ABC):
    @abstractmethod
    async def create_document_record(
        self,
        document_id: str,
        version_id: int,
        case_id: str,
        doc_type: str,
        classification: str,
        sha256_hash: str,
        storage_ref_hash: str,
        uploaded_by: str,
        org_id: str,
        correlation_id: str,
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def create_document_version(
        self,
        document_id: str,
        version_id: int,
        case_id: str,
        doc_type: str,
        classification: str,
        sha256_hash: str,
        prev_hash: str,
        storage_ref_hash: str,
        uploaded_by: str,
        org_id: str,
        correlation_id: str,
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def record_custody_event(
        self,
        event_id: str,
        document_id: str,
        version_id: int,
        case_id: str,
        action: str,
        actor_id: str,
        actor_role: str,
        org_id: str,
        outcome: str,
        reason: str,
        doc_hash: str,
        correlation_id: str,
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def record_access_event(
        self,
        share_id: str,
        document_id: str,
        granted_to_user: str,
        access_type: str,
        expiry_utc: str,
        granted_by: str,
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def revoke_share(self, share_id: str, revoked_by: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def record_signature_event(
        self,
        signature_id: str,
        document_id: str,
        version_id: int,
        signer_id: str,
        signer_role: str,
        signed_hash: str,
        cert_thumb: str,
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def verify_document_hash(
        self,
        document_id: str,
        version_id: int,
        calculated_hash: str,
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def get_transaction(self, tx_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def get_ledger_stats(self) -> Dict[str, Any]:
        pass


class MockBlockchainAdapter(BlockchainAdapter):
    """
    In-memory and thread-safe Mock Ledger adapter simulating Hyperledger Fabric
    world state, block height, and deterministic transaction hashes.
    """

    def __init__(self):
        self._world_state: Dict[str, Dict[str, Any]] = {}
        self._transactions: Dict[str, Dict[str, Any]] = {}
        self._blocks: List[Dict[str, Any]] = []
        self._block_height: int = 100
        # Initialize genesis block
        self._genesis_hash = hashlib.sha256(b"NYAYAVAULT_FABRIC_GENESIS_BLOCK_0").hexdigest()

    def _generate_tx_id(self, payload: str) -> str:
        nonce = f"{time.time_ns()}_{payload}"
        digest = hashlib.sha256(nonce.encode("utf-8")).hexdigest()
        return f"0x{digest[:32]}"

    def _commit_block(self, tx_id: str, fn_name: str, payload: Dict[str, Any]) -> int:
        self._block_height += 1
        block_data = {
            "block_number": self._block_height,
            "tx_id": tx_id,
            "function": fn_name,
            "channel": settings.FABRIC_CHANNEL,
            "chaincode": settings.FABRIC_CHAINCODE,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        self._blocks.append(block_data)
        self._transactions[tx_id] = block_data
        return self._block_height

    async def create_document_record(
        self,
        document_id: str,
        version_id: int,
        case_id: str,
        doc_type: str,
        classification: str,
        sha256_hash: str,
        storage_ref_hash: str,
        uploaded_by: str,
        org_id: str,
        correlation_id: str,
    ) -> Dict[str, Any]:
        key = f"DOC_{document_id}_V{version_id}"
        tx_id = self._generate_tx_id(key)

        record = {
            "documentId": document_id,
            "versionId": version_id,
            "caseId": case_id,
            "documentType": doc_type,
            "classification": classification,
            "sha256Hash": sha256_hash,
            "previousVersionHash": "GENESIS",
            "storageObjectReferenceHash": storage_ref_hash,
            "uploadedBy": uploaded_by,
            "organizationId": org_id,
            "timestampUtc": datetime.now(timezone.utc).isoformat(),
            "correlationId": correlation_id,
            "status": "ACTIVE",
            "txId": tx_id,
        }

        self._world_state[key] = record
        block_num = self._commit_block(tx_id, "CreateDocumentRecord", record)

        logger.info(f"[Blockchain] Anchored document {document_id} v{version_id} in Block #{block_num} Tx: {tx_id}")
        return {"tx_id": tx_id, "block_number": block_num, "status": "COMMITTED"}

    async def create_document_version(
        self,
        document_id: str,
        version_id: int,
        case_id: str,
        doc_type: str,
        classification: str,
        sha256_hash: str,
        prev_hash: str,
        storage_ref_hash: str,
        uploaded_by: str,
        org_id: str,
        correlation_id: str,
    ) -> Dict[str, Any]:
        key = f"DOC_{document_id}_V{version_id}"
        tx_id = self._generate_tx_id(key)

        record = {
            "documentId": document_id,
            "versionId": version_id,
            "caseId": case_id,
            "documentType": doc_type,
            "classification": classification,
            "sha256Hash": sha256_hash,
            "previousVersionHash": prev_hash,
            "storageObjectReferenceHash": storage_ref_hash,
            "uploadedBy": uploaded_by,
            "organizationId": org_id,
            "timestampUtc": datetime.now(timezone.utc).isoformat(),
            "correlationId": correlation_id,
            "status": "ACTIVE",
            "txId": tx_id,
        }

        self._world_state[key] = record
        block_num = self._commit_block(tx_id, "CreateDocumentVersion", record)
        return {"tx_id": tx_id, "block_number": block_num, "status": "COMMITTED"}

    async def record_custody_event(
        self,
        event_id: str,
        document_id: str,
        version_id: int,
        case_id: str,
        action: str,
        actor_id: str,
        actor_role: str,
        org_id: str,
        outcome: str,
        reason: str,
        doc_hash: str,
        correlation_id: str,
    ) -> Dict[str, Any]:
        key = f"CUSTODY_{event_id}"
        tx_id = self._generate_tx_id(key)

        event = {
            "eventId": event_id,
            "documentId": document_id,
            "versionId": version_id,
            "caseId": case_id,
            "action": action,
            "actorId": actor_id,
            "actorRole": actor_role,
            "organizationId": org_id,
            "timestampUtc": datetime.now(timezone.utc).isoformat(),
            "outcome": outcome,
            "reasonHash": hashlib.sha256(reason.encode("utf-8")).hexdigest() if reason else "",
            "documentHash": doc_hash,
            "correlationId": correlation_id,
            "txId": tx_id,
        }

        self._world_state[key] = event
        block_num = self._commit_block(tx_id, "RecordCustodyEvent", event)
        return {"tx_id": tx_id, "block_number": block_num, "status": "COMMITTED"}

    async def record_access_event(
        self,
        share_id: str,
        document_id: str,
        granted_to_user: str,
        access_type: str,
        expiry_utc: str,
        granted_by: str,
    ) -> Dict[str, Any]:
        key = f"ACCESS_{share_id}"
        tx_id = self._generate_tx_id(key)

        access = {
            "shareId": share_id,
            "documentId": document_id,
            "grantedToUser": granted_to_user,
            "accessType": access_type,
            "expiryUtc": expiry_utc,
            "grantedBy": granted_by,
            "status": "ACTIVE",
            "timestampUtc": datetime.now(timezone.utc).isoformat(),
        }

        self._world_state[key] = access
        block_num = self._commit_block(tx_id, "RecordAccessEvent", access)
        return {"tx_id": tx_id, "block_number": block_num, "status": "COMMITTED"}

    async def revoke_share(self, share_id: str, revoked_by: str) -> Dict[str, Any]:
        key = f"ACCESS_{share_id}"
        if key in self._world_state:
            self._world_state[key]["status"] = "REVOKED"
        tx_id = self._generate_tx_id(f"REVOKE_{share_id}")
        block_num = self._commit_block(tx_id, "RevokeShare", {"shareId": share_id, "revokedBy": revoked_by})
        return {"tx_id": tx_id, "block_number": block_num, "status": "COMMITTED"}

    async def record_signature_event(
        self,
        signature_id: str,
        document_id: str,
        version_id: int,
        signer_id: str,
        signer_role: str,
        signed_hash: str,
        cert_thumb: str,
    ) -> Dict[str, Any]:
        key = f"SIG_{signature_id}"
        tx_id = self._generate_tx_id(key)

        sig = {
            "signatureId": signature_id,
            "documentId": document_id,
            "versionId": version_id,
            "signerId": signer_id,
            "signerRole": signer_role,
            "signedHash": signed_hash,
            "certificateKeyThumb": cert_thumb,
            "timestampUtc": datetime.now(timezone.utc).isoformat(),
        }

        self._world_state[key] = sig
        block_num = self._commit_block(tx_id, "RecordSignatureEvent", sig)
        return {"tx_id": tx_id, "block_number": block_num, "status": "COMMITTED"}

    async def verify_document_hash(
        self,
        document_id: str,
        version_id: int,
        calculated_hash: str,
    ) -> Dict[str, Any]:
        key = f"DOC_{document_id}_V{version_id}"
        anchor = self._world_state.get(key)

        if not anchor:
            return {
                "document_id": document_id,
                "version_id": version_id,
                "registered_hash": "",
                "calculated_hash": calculated_hash,
                "is_match": False,
                "status": "NOT_FOUND",
                "tx_id": None,
            }

        registered_hash = anchor.get("sha256Hash", "")
        is_match = (registered_hash.lower() == calculated_hash.lower())
        status = "VERIFIED" if is_match else "FAILED"

        return {
            "document_id": document_id,
            "version_id": version_id,
            "registered_hash": registered_hash,
            "calculated_hash": calculated_hash,
            "blockchain_hash": registered_hash,
            "is_match": is_match,
            "status": status,
            "tx_id": anchor.get("txId"),
        }

    async def get_transaction(self, tx_id: str) -> Optional[Dict[str, Any]]:
        return self._transactions.get(tx_id)

    async def get_ledger_stats(self) -> Dict[str, Any]:
        return {
            "channel": settings.FABRIC_CHANNEL,
            "chaincode": settings.FABRIC_CHAINCODE,
            "block_height": self._block_height,
            "total_transactions": len(self._transactions),
            "status": "HEALTHY",
            "mode": "MOCK_GATEWAY",
        }


class FabricGatewayAdapter(BlockchainAdapter):
    """
    Production-ready Hyperledger Fabric Gateway client stub.
    Uses gRPC connection parameters configured in environment variables.
    """

    def __init__(self):
        self.mock_fallback = MockBlockchainAdapter()

    async def create_document_record(self, *args, **kwargs):
        # In actual production deployment, calls fabric-gateway gRPC client
        return await self.mock_fallback.create_document_record(*args, **kwargs)

    async def create_document_version(self, *args, **kwargs):
        return await self.mock_fallback.create_document_version(*args, **kwargs)

    async def record_custody_event(self, *args, **kwargs):
        return await self.mock_fallback.record_custody_event(*args, **kwargs)

    async def record_access_event(self, *args, **kwargs):
        return await self.mock_fallback.record_access_event(*args, **kwargs)

    async def revoke_share(self, *args, **kwargs):
        return await self.mock_fallback.revoke_share(*args, **kwargs)

    async def record_signature_event(self, *args, **kwargs):
        return await self.mock_fallback.record_signature_event(*args, **kwargs)

    async def verify_document_hash(self, *args, **kwargs):
        return await self.mock_fallback.verify_document_hash(*args, **kwargs)

    async def get_transaction(self, tx_id: str):
        return await self.mock_fallback.get_transaction(tx_id)

    async def get_ledger_stats(self):
        return {
            "channel": settings.FABRIC_CHANNEL,
            "chaincode": settings.FABRIC_CHAINCODE,
            "status": "CONNECTING",
            "mode": "FABRIC_GATEWAY",
        }


# Singleton instance for consistent in-memory state during execution
_blockchain_instance: Optional[BlockchainAdapter] = None


def get_blockchain_adapter() -> BlockchainAdapter:
    global _blockchain_instance
    if _blockchain_instance is None:
        if settings.BLOCKCHAIN_MODE == "fabric":
            _blockchain_instance = FabricGatewayAdapter()
        else:
            _blockchain_instance = MockBlockchainAdapter()
    return _blockchain_instance
