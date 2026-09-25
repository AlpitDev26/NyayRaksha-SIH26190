import pytest
from app.adapters.blockchain.blockchain_adapter import MockBlockchainAdapter


@pytest.mark.asyncio
async def test_mock_blockchain_lifecycle():
    adapter = MockBlockchainAdapter()

    # 1. Create Document Record
    receipt = await adapter.create_document_record(
        document_id="doc-test-99",
        version_id=1,
        case_id="CASE-2026-000101",
        doc_type="FIR",
        classification="RESTRICTED",
        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        storage_ref_hash="storage_ref_mock",
        uploaded_by="u-officer",
        org_id="POLICE_MSP",
        correlation_id="corr-test-1",
    )
    assert receipt["status"] == "COMMITTED"
    assert receipt["tx_id"].startswith("0x")
    assert receipt["block_number"] > 100

    # 2. Verify Valid Hash
    verify_res = await adapter.verify_document_hash(
        document_id="doc-test-99",
        version_id=1,
        calculated_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    )
    assert verify_res["status"] == "VERIFIED"
    assert verify_res["is_match"] is True

    # 3. Verify Tampered Hash
    tampered_res = await adapter.verify_document_hash(
        document_id="doc-test-99",
        version_id=1,
        calculated_hash="ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    )
    assert tampered_res["status"] == "FAILED"
    assert tampered_res["is_match"] is False
