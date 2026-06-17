import requests

BASE_URL = "http://localhost:8080"
REGISTER_ENDPOINT = "/api/auth/register"
LOGIN_ENDPOINT = "/api/auth/login"
QUIZ_ANSWER_ENDPOINT = "/api/quiz/answer"
TIMEOUT = 30

def test_post_api_quiz_answer_with_invalid_body():
    # Register a new user to get a valid JWT
    register_payload = {
        "email": "testuser_tc009@example.com",
        "password": "SafePassword123!",
        "nickname": "testuser_tc009"
    }
    try:
        register_resp = requests.post(
            BASE_URL + REGISTER_ENDPOINT, 
            json=register_payload, 
            timeout=TIMEOUT
        )
        register_resp.raise_for_status()
    except Exception as e:
        assert False, f"User registration failed: {e}"
    token = register_resp.json().get("token")
    assert token, "Registration did not return a token"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Prepare invalid payloads: missing quizId, missing isCorrect, invalid quizId, invalid isCorrect
    invalid_payloads = [
        {},  # missing both fields
        {"isCorrect": True},  # missing quizId
        {"quizId": 123},  # missing isCorrect
        {"quizId": "notanumber", "isCorrect": True},  # invalid quizId type
        {"quizId": 123, "isCorrect": "notabool"}  # invalid isCorrect type
    ]

    for payload in invalid_payloads:
        try:
            resp = requests.post(
                BASE_URL + QUIZ_ANSWER_ENDPOINT,
                headers=headers,
                json=payload,
                timeout=TIMEOUT
            )
        except Exception as e:
            assert False, f"Request to /api/quiz/answer failed with exception: {e}"

        # We expect an error response: HTTP status NOT 200 and success not true
        # The PRD does not specify the exact error code or response schema for invalid body,
        # so we check that status code is not 200 or success is False or missing
        if resp.status_code == 200:
            json_resp = {}
            try:
                json_resp = resp.json()
            except Exception:
                pass
            success = json_resp.get("success")
            assert success is not True, f"API accepted invalid payload: {payload}"
        else:
            # Status code should be an error code e.g. 400 Bad Request
            assert resp.status_code >= 400, f"Expected client error status for payload: {payload}, got {resp.status_code}"

test_post_api_quiz_answer_with_invalid_body()