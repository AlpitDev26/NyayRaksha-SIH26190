import pytest


@pytest.mark.asyncio
async def test_successful_integrity_verification(client):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "officer@nyayraksha.demo", "password": "DemoSecurePassword2026!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get documents
    docs_resp = await client.get("/api/v1/documents", headers=headers)
    docs = docs_resp.json()
    valid_doc = next(d for d in docs if not d.get("is_simulated_tampered"))

    # Verify integrity
    verify_resp = await client.post(f"/api/v1/documents/{valid_doc['id']}/verify", headers=headers)
    assert verify_resp.status_code == 200
    res = verify_resp.json()
    assert res["status"] == "VERIFIED"
    assert res["is_tampered"] is False
    assert res["calculated_hash"] == res["registered_hash"]


@pytest.mark.asyncio
async def test_simulated_tampering_detection_and_lock(client):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "officer@nyayraksha.demo", "password": "DemoSecurePassword2026!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get the simulated tampered document
    docs_resp = await client.get("/api/v1/documents", headers=headers)
    docs = docs_resp.json()
    tampered_doc = next(d for d in docs if d.get("is_simulated_tampered"))

    # Run verification on tampered document
    verify_resp = await client.post(f"/api/v1/documents/{tampered_doc['id']}/verify", headers=headers)
    assert verify_resp.status_code == 200
    res = verify_resp.json()
    assert res["status"] == "FAILED"
    assert res["is_tampered"] is True
    assert res["incident_number"] is not None
    assert "TAMPERING DETECTED" in res["message"]
