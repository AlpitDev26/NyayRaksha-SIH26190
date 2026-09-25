import pytest


@pytest.mark.asyncio
async def test_officer_login_success(client):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "officer@nyayraksha.demo", "password": "DemoSecurePassword2026!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "AUTHENTICATED"
    assert "access_token" in data
    assert data["user"]["email"] == "officer@nyayraksha.demo"
    assert "POLICE_OFFICER" in data["user"]["roles"]


@pytest.mark.asyncio
async def test_judge_login_requires_mfa(client):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "judge@nyayraksha.demo", "password": "DemoSecurePassword2026!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "MFA_REQUIRED"
    assert "temp_token" in data


@pytest.mark.asyncio
async def test_invalid_credentials_generic_error(client):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "officer@nyayraksha.demo", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "AUTH_FAILED" in str(data) or "Invalid" in str(data)
