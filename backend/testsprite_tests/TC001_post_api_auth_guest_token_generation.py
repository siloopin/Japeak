import requests

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_post_api_auth_guest_token_generation():
    url = f"{BASE_URL}/api/auth/guest"
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, headers=headers, timeout=TIMEOUT)
        # Check HTTP status code
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

        json_data = response.json()
        # Check the presence of token key
        assert "token" in json_data, "Response JSON does not contain 'token' key"

        token = json_data["token"]
        assert isinstance(token, str) and len(token) > 0, "Token should be a non-empty string"

        # Verify token is a valid JWT (basic format check)
        # JWT format: header.payload.signature (three base64url separated by dots)
        parts = token.split('.')
        assert len(parts) == 3, "Token is not a valid JWT format"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"
    except ValueError:
        assert False, "Response is not valid JSON"

test_post_api_auth_guest_token_generation()