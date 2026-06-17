import requests

BASE_URL = "http://localhost:8080"
TIMEOUT = 30


def test_get_api_quiz_next_adaptive_quiz_retrieval():
    url_auth = f"{BASE_URL}/api/auth/guest"
    url_quiz_next = f"{BASE_URL}/api/quiz/next"

    # Step 1: Get guest JWT token (no auth required but token usage unspecified, assume optional)
    try:
        auth_response = requests.post(url_auth, timeout=TIMEOUT)
        auth_response.raise_for_status()
        token = auth_response.json().get("token", None)
        # Token may not be required, but if present, use it
        headers = {"Authorization": f"Bearer {token}"} if token else {}
    except Exception as e:
        # Fail if token retrieval failed unexpectedly
        raise AssertionError(f"Guest token retrieval failed: {e}")

    # Step 2: Define valid query parameters as per test plan
    params = {
        "difficulty": "beginner",
        "wasCorrect": True,
        "consecutiveCorrect": 3
    }

    # Step 3: Make GET request to /api/quiz/next
    try:
        response = requests.get(url_quiz_next, headers=headers, params=params, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        raise AssertionError(f"Request to /api/quiz/next failed: {e}")

    # Step 4: Validate response status is 200
    assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"

    # Step 5: Validate response payload matches expected QuizDto structure
    # Since exact QuizDto schema isn't given, validate some reasonable fields exist
    # Usually QuizDto might contain id, question, options, difficulty, etc.
    quiz = response.json()
    assert isinstance(quiz, dict), "Response JSON is not an object"

    # Validate presence and types of key expected fields (adapt as necessary)
    expected_fields = ["quizId", "question", "options", "difficulty"]
    for field in expected_fields:
        assert field in quiz, f"Missing field '{field}' in QuizDto response"

    # Validate difficulty matches requested difficulty
    assert quiz.get("difficulty") == params["difficulty"], f"Expected difficulty '{params['difficulty']}', got '{quiz.get('difficulty')}'"

    # Additional minimal checks
    assert isinstance(quiz["quizId"], int), "quizId should be integer"
    assert isinstance(quiz["question"], str) and quiz["question"], "question should be non-empty string"
    assert isinstance(quiz["options"], list) and len(quiz["options"]) > 0, "options should be non-empty list"

    print("Test TC002 passed: GET /api/quiz/next returned valid QuizDto with adaptive quiz content.")


test_get_api_quiz_next_adaptive_quiz_retrieval()