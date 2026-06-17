import requests

BASE_URL = "http://localhost:8080"
REGISTER_URL = BASE_URL + "/api/auth/register"
LOGIN_URL = BASE_URL + "/api/auth/login"
QUIZ_NEXT_URL = BASE_URL + "/api/quiz/next"

TIMEOUT = 30

def test_getapiquiznextwithvalidjwtandparameters():
    # Register a new user
    register_payload = {
        "email": "testuser_tc005@example.com",
        "password": "SecurePass123!",
        "nickname": "testuser_tc005"
    }
    try:
        reg_resp = requests.post(REGISTER_URL, json=register_payload, timeout=TIMEOUT)
        assert reg_resp.status_code == 200, f"Registration failed with status {reg_resp.status_code}"
        reg_json = reg_resp.json()
        token = reg_json.get("token")
        assert token and isinstance(token, str), "Token missing or invalid after registration"
    except AssertionError:
        # Possibly user exists, try logging in
        login_payload = {
            "email": register_payload["email"],
            "password": register_payload["password"]
        }
        login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_json = login_resp.json()
        token = login_json.get("token")
        assert token and isinstance(token, str), "Token missing or invalid after login"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }

    params = {
        "difficulty": "easy",
        "wasCorrect": True,
        "consecutiveCorrect": 2
    }

    response = requests.get(QUIZ_NEXT_URL, headers=headers, params=params, timeout=TIMEOUT)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
    
    quiz = response.json()
    # Validate essential fields of QuizDto
    assert isinstance(quiz, dict), "Response is not a JSON object"
    assert "id" in quiz and isinstance(quiz["id"], int), "id missing or invalid"
    assert "question" in quiz and isinstance(quiz["question"], str) and quiz["question"], "question missing or empty"
    assert "choices" in quiz and isinstance(quiz["choices"], list) and len(quiz["choices"]) > 0, "choices missing or empty"
    assert "difficulty" in quiz and isinstance(quiz["difficulty"], str), "difficulty missing or invalid"
    
test_getapiquiznextwithvalidjwtandparameters()
