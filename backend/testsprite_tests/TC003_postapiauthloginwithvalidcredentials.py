import requests

base_url = "http://localhost:8080"

def test_postapiauthloginwithvalidcredentials():
    login_url = f"{base_url}/api/auth/login"
    login_payload = {
        "email": "testuser@example.com",
        "password": "ValidPassword123"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        # Perform login with valid credentials
        response = requests.post(login_url, json=login_payload, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected 200 OK but got {response.status_code}"
        
        json_data = response.json()
        assert "token" in json_data and isinstance(json_data["token"], str) and len(json_data["token"]) > 0, "JWT token missing or invalid"
        assert "user" in json_data and isinstance(json_data["user"], dict), "User profile missing or invalid"
        
        token = json_data["token"]
        user = json_data["user"]
        
        # Use the returned token to make an authenticated request to verify token validity
        quiz_next_url = f"{base_url}/api/quiz/next"
        auth_headers = {
            "Authorization": f"Bearer {token}"
        }
        params = {
            "difficulty": "easy",
            "wasCorrect": True,
            "consecutiveCorrect": 1
        }
        quiz_response = requests.get(quiz_next_url, headers=auth_headers, params=params, timeout=30)
        # We expect 200 if token is valid and request is authorized
        assert quiz_response.status_code == 200, f"Authenticated request failed with status code {quiz_response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed: {str(e)}"

test_postapiauthloginwithvalidcredentials()