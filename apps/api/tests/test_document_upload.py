import io
import pytest


@pytest.mark.asyncio
async def test_document_upload_and_blockchain_receipt(client):
    # 1. Login as Officer
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "officer@nyayraksha.demo", "password": "DemoSecurePassword2026!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload Document
    file_content = b"TEST FIR SUPPLEMENTARY EXHIBIT CONTENT FOR HASHING 2026"
    files = {
        "file": ("supplementary_statement.pdf", io.BytesIO(file_content), "application/pdf")
    }
    data = {
        "case_id": "CASE-2026-000101",
        "title": "Supplementary Statement No. 4",
        "document_type": "WITNESS_STATEMENT",
        "classification": "RESTRICTED",
        "description": "Recorded during supplementary field investigation",
        "tags": "test,witness",
    }

    upload_resp = await client.post(
        "/api/v1/documents/upload",
        headers=headers,
        data=data,
        files=files,
    )
    assert upload_resp.status_code == 201
    receipt = upload_resp.json()
    assert receipt["version"] == 1
    assert "sha256_hash" in receipt
    assert len(receipt["sha256_hash"]) == 64
    assert receipt["storage_status"] == "ENCRYPTED_AES256"
    assert receipt["virus_scan_status"] == "CLEAN"
    assert receipt["blockchain_tx_id"].startswith("0x")
