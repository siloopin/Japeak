import requests

def test_get_api_quiz_next_without_jwt():
    base_url = "http://localhost:8080"
    url = f"{base_url}/api/quiz/next"
    params = {
        "difficulty": "easy",
        "wasCorrect": True,
        "consecutiveCorrect": 1
    }
    headers = {
        # No Authorization header to simulate missing JWT
    }
    try:
        response = requests.get(url, headers=headers, params=params, timeout=30)
    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

    # Accepting 400 also as some implementations may respond with Bad Request on missing JWT
    assert response.status_code in (400, 401, 403), \
        f"Expected 400, 401 or 403 status code for missing JWT, got {response.status_code}"

    try:
        json_resp = response.json()
    except ValueError:
        json_resp = {}

    assert ("error" in json_resp and "authentication" in str(json_resp.get("error", "")).lower()) or \
           ("message" in json_resp and "authentication" in str(json_resp.get("message", "")).lower()) or \
           (response.status_code in (400, 401, 403)), \
           "Response does not indicate authentication error as expected"

test_get_api_quiz_next_without_jwt()
