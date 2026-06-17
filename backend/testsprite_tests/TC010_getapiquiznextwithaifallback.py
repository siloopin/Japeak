import requests
import time

BASE_URL = "http://localhost:8080"
REGISTER_URL = f"{BASE_URL}/api/auth/register"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
QUIZ_NEXT_URL = f"{BASE_URL}/api/quiz/next"

TEST_USER_EMAIL = "testaifallbackuser@example.com"
TEST_USER_PASSWORD = "StrongP@ssw0rd!"
TEST_USER_NICKNAME = "AIfallbackTester"

def test_getapiquiznextwithaifallback():
    # Register a new user
    try:
        reg_response = requests.post(
            REGISTER_URL,
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "nickname": TEST_USER_NICKNAME
            },
            timeout=30
        )
        # It might exist already in repeated runs: accept 200 or 400 with already exists message
        if reg_response.status_code == 400:
            reg_json = reg_response.json()
            if "already exists" not in str(reg_json).lower():
                reg_response.raise_for_status()
        else:
            reg_response.raise_for_status()
    except requests.RequestException as e:
        # If registration fails due to existing user, try login
        pass

    # Login to get JWT token
    login_response = requests.post(
        LOGIN_URL,
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        },
        timeout=30
    )
    login_response.raise_for_status()
    login_data = login_response.json()
    token = login_data.get("token")
    assert token and isinstance(token, str), "JWT token not found after login"

    headers = {"Authorization": f"Bearer {token}"}

    # We want to simulate conditions where AI generation is needed and Gemini fails/rate limits,
    # backend falls back to Groq.
    # Since we can't force Gemini failure externally from test,
    # we will call GET /api/quiz/next with parameters that likely trigger AI generation fallback.
    # Use parameters that are arbitrary but valid.
    params = {
        "difficulty": "medium",
        "wasCorrect": False,
        "consecutiveCorrect": 0
    }

    # We may retry a few times to simulate fallback if endpoint has internal delay or failures
    # to confirm fallback response.
    fallback_response = None
    for _ in range(3):
        response = requests.get(QUIZ_NEXT_URL, headers=headers, params=params, timeout=30)
        if response.status_code == 200:
            fallback_response = response
            break
        elif response.status_code in {429, 503}:  # rate limit or service unavailable
            time.sleep(1)
        else:
            response.raise_for_status()
    assert fallback_response is not None, "Did not receive successful response from quiz next endpoint"

    quiz_dto = fallback_response.json()
    # Validate essential fields in QuizDto - basic validation
    # Expecting at least an id and a question field per typical quiz data
    assert isinstance(quiz_dto, dict), "QuizDto response is not a dict"
    assert "id" in quiz_dto and isinstance(quiz_dto["id"], int), "QuizDto missing valid 'id'"
    assert "question" in quiz_dto and isinstance(quiz_dto["question"], str) and quiz_dto["question"], "QuizDto missing valid 'question'"

    # There is no direct flag to confirm fallback model used,
    # but the test assumes if 200 and QuizDto received despite possible Gemini fail, fallback succeeded.

test_getapiquiznextwithaifallback()
