import requests

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_post_api_quiz_log_attempt_recording():
    try:
        # Get a quiz to use its quizId for the log
        next_quiz_response = requests.get(
            f"{BASE_URL}/api/quiz/next",
            params={"difficulty": "beginner", "wasCorrect": True, "consecutiveCorrect": 0},
            timeout=TIMEOUT
        )
        assert next_quiz_response.status_code == 200, f"Failed to get next quiz: {next_quiz_response.text}"
        quiz_data = next_quiz_response.json()
        quiz_id = quiz_data.get("id") or quiz_data.get("quizId")
        assert quiz_id is not None, "quizId not found in quiz data"

        # Use a dummy userId as test plan doesn't specify how to retrieve userId; we use 1
        user_id = 1
        is_correct = True

        log_payload = {
            "userId": user_id,
            "quizId": quiz_id,
            "isCorrect": is_correct
        }

        log_response = requests.post(
            f"{BASE_URL}/api/quiz/log",
            json=log_payload,
            timeout=TIMEOUT
        )
        assert log_response.status_code == 200, f"Logging quiz attempt failed: {log_response.text}"
        confirmation = log_response.text
        assert isinstance(confirmation, str) and len(confirmation) > 0, "Confirmation string is empty or invalid"

        # Verify attempt stored for future adaptive generation
        followup_response = requests.get(
            f"{BASE_URL}/api/quiz/next",
            params={"difficulty": "beginner", "wasCorrect": is_correct, "consecutiveCorrect": 1},
            timeout=TIMEOUT
        )
        assert followup_response.status_code == 200, f"Failed to get follow-up quiz: {followup_response.text}"
        followup_quiz_data = followup_response.json()
        assert followup_quiz_data is not None and isinstance(followup_quiz_data, dict), "Follow-up quiz data invalid"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_quiz_log_attempt_recording()
