import requests

def test_postapiauthloginwithinvalidcredentials():
    base_url = "http://localhost:8080//Users/wernger7/Japeak/backend"
    login_url = f"{base_url}/api/auth/login"
    headers = {"Content-Type": "application/json"}
    invalid_credentials = {
        "email": "invaliduser@example.com",
        "password": "wrongpassword123"
    }
    try:
        response = requests.post(login_url, json=invalid_credentials, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request to login endpoint failed: {e}"

    # Assert that the response indicates failure (not 200)
    # Since successful login returns 200 with token, invalid should not return 200
    # But some APIs might return 401 or 400 for invalid creds
    assert response.status_code != 200, f"Expected non-200 status for invalid login, got {response.status_code}"

    try:
        json_response = response.json()
    except ValueError:
        json_response = {}

    # Assert that no token is present in response
    assert "token" not in json_response, "JWT token should not be issued for invalid credentials"

    # Assert error message or indication of failure is present (common keys: error, message)
    error_msg_keys = ["error", "message", "detail"]
    error_found = any(key in json_response for key in error_msg_keys)
    assert error_found or response.status_code in (400, 401, 403), "Expected error message or HTTP auth error status for invalid login"

test_postapiauthloginwithinvalidcredentials()