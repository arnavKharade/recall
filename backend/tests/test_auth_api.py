
from uuid import uuid4


def unique_email():
    return f"test-{uuid4().hex}@example.com"


def test_register_user(client):
    email = unique_email()

    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Arnav Test",
            "email": email,
            "password": "StrongPassword123!",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["name"] == "Arnav Test"
    assert data["email"] == email
    assert data["is_active"] is True
    assert "password" not in data
    assert "password_hash" not in data


def test_registration_normalizes_email(client):
    email = unique_email()

    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Email Test",
            "email": f"  {email.upper()}  ",
            "password": "StrongPassword123!",
        },
    )

    assert response.status_code == 201
    assert response.json()["email"] == email


def test_duplicate_registration_returns_conflict(client):
    payload = {
        "name": "Duplicate User",
        "email": unique_email(),
        "password": "StrongPassword123!",
    }

    first = client.post("/api/v1/auth/register", json=payload)
    second = client.post("/api/v1/auth/register", json=payload)

    assert first.status_code == 201
    assert second.status_code == 409


def test_login_returns_access_token(client):
    email = unique_email()

    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Login User",
            "email": email,
            "password": "StrongPassword123!",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "StrongPassword123!",
        },
    )

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]


def test_login_rejects_wrong_password(client):
    email = unique_email()

    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Login User",
            "email": email,
            "password": "StrongPassword123!",
        },
    )

    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401


def test_profile_requires_authentication(client):
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401


def test_authenticated_user_can_access_profile(client, auth_headers):
    response = client.get(
        "/api/v1/auth/me",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["email"] == "testuser@example.com"
    assert response.json()["name"] == "Test User"
