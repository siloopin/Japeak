import requests
import uuid

BASE_URL = "http://localhost:8080"
REGISTER_URL = f"{BASE_URL}/api/auth/register"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
QUIZ_NEXT_URL = f"{BASE_URL}/api/quiz/next"

def test_getapiquiznextwithrepeatedcorrectanswers():
    # Create a unique user for authentication
    unique_email = f"testuser_{uuid.uuid4()}@example.com"
    password = "TestPass123!"
    nickname = "TestUser"

    # Register user
    register_payload = {
        "email": unique_email,
        "password": password,
        "nickname": nickname
    }
    reg_resp = requests.post(REGISTER_URL, json=register_payload, timeout=30)
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    reg_data = reg_resp.json()
    assert "token" in reg_data and "user" in reg_data, "Registration response missing token or user"

    # Login user to get fresh token (optional but safer)
    login_payload = {
        "email": unique_email,
        "password": password
    }
    login_resp = requests.post(LOGIN_URL, json=login_payload, timeout=30)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    assert "token" in login_data and "user" in login_data, "Login response missing token or user"
    token = login_data["token"]

    headers = {
        "Authorization": f"Bearer {token}"
    }

    # Define parameters for repeated correct answers and a higher consecutiveCorrect count
    params = {
        "difficulty": "medium",
        "wasCorrect": True,
        "consecutiveCorrect": 5  # Higher count to prompt harder quiz
    }

    # Call GET /api/quiz/next with the above parameters
    quiz_resp = requests.get(QUIZ_NEXT_URL, headers=headers, params=params, timeout=30)
    assert quiz_resp.status_code == 200, f"Quiz next request failed: {quiz_resp.text}"
    quiz_data = quiz_resp.json()
    # Validate response contains essential QuizDto fields (example guess based on typical quiz data)
    required_fields = ["quizId", "question", "options", "difficulty"]
    for field in required_fields:
        assert field in quiz_data, f"QuizDto missing field: {field}"

    # Ensure difficulty is more challenging or equal to 'medium', assuming order: easy < medium < hard
    difficulty_levels = {"easy": 1, "medium": 2, "hard": 3}
    response_difficulty = quiz_data.get("difficulty", "").lower()
    assert response_difficulty in difficulty_levels, "Response difficulty unexpected"
    assert difficulty_levels[response_difficulty] >= difficulty_levels["medium"], \
        f"Expected difficulty medium or higher, got {response_difficulty}"

test_getapiquiznextwithrepeatedcorrectanswers()
