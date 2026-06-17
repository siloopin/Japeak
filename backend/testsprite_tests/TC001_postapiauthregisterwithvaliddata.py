import requests
import uuid

BASE_URL = "http://localhost:8080"
REGISTER_ENDPOINT = "/api/auth/register"
TIMEOUT = 30


def test_postapiauthregisterwithvaliddata():
    url = BASE_URL + REGISTER_ENDPOINT
    unique_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": unique_email,
        "password": "StrongP@ssw0rd123",
        "nickname": "testnickname"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

        json_resp = response.json()
        assert "token" in json_resp, "Response JSON does not contain 'token'"
        assert isinstance(json_resp["token"], str) and len(json_resp["token"]) > 0, "'token' should be a non-empty string"

        assert "user" in json_resp, "Response JSON does not contain 'user'"
        user = json_resp["user"]
        assert isinstance(user, dict), "'user' should be a dictionary"
        assert user.get("email") == unique_email, "Registered email does not match"
        assert "nickname" in user and user["nickname"] == "testnickname", "Nickname does not match in user profile"
    finally:
        pass


test_postapiauthregisterwithvaliddata()