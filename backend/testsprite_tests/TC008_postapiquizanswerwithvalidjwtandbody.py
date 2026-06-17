import requests

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_post_api_quiz_answer_with_valid_jwt_and_body():
    # First, login to get a valid JWT token
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {
        "email": "testuser@example.com",
        "password": "TestPassword123!"
    }
    try:
        login_response = requests.post(login_url, json=login_payload, timeout=TIMEOUT)
        login_response.raise_for_status()
        login_data = login_response.json()
        token = login_data.get("token")
        assert token is not None, "No token received on login"
    except Exception as e:
        raise AssertionError(f"Login failed: {e}")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Fetch a quiz to get a valid quizId
    quiz_next_url = f"{BASE_URL}/api/quiz/next"
    params = {
        "difficulty": "easy",
        "wasCorrect": True,
        "consecutiveCorrect": 1
    }

    try:
        quiz_next_response = requests.get(quiz_next_url, headers=headers, params=params, timeout=TIMEOUT)
        quiz_next_response.raise_for_status()
        quiz_data = quiz_next_response.json()
        quiz_id = quiz_data.get("id")
        assert isinstance(quiz_id, int), "No valid quizId received from quiz next"
    except Exception as e:
        raise AssertionError(f"Failed to fetch next quiz: {e}")

    answer_url = f"{BASE_URL}/api/quiz/answer"
    answer_payload = {
        "quizId": quiz_id,
        "isCorrect": True
    }

    try:
        answer_response = requests.post(answer_url, headers=headers, json=answer_payload, timeout=TIMEOUT)
        answer_response.raise_for_status()
        answer_data = answer_response.json()
        assert answer_data.get("success") is True, "Quiz answer logging did not return success true"
    except Exception as e:
        raise AssertionError(f"Posting quiz answer failed: {e}")

test_post_api_quiz_answer_with_valid_jwt_and_body()
