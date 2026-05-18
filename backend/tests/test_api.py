from fastapi.testclient import TestClient

from app.main import create_app


client = TestClient(create_app())


def test_health_check() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_auth_me_uses_mock_user() -> None:
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 200
    assert response.json()["email"] == "admin@example.com"


def test_users_list_is_available_for_mock_admin() -> None:
    response = client.get("/api/v1/users")

    assert response.status_code == 200
    assert response.json()["items"] == []
