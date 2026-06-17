import requests

BASE_URL = "http://localhost:8080"
REGISTER_ENDPOINT = "/api/auth/register"
TIMEOUT = 30

def test_postapiauthregisterwithexistingemail():
    existing_email = "existinguser@example.com"
    password = "TestPass123!"
    nickname = "ExistingUser"

    # First, ensure the email is registered
    register_payload = {
        "email": existing_email,
        "password": password,
        "nickname": nickname
    }
    headers = {
        "Content-Type": "application/json"
    }

    # Register the email once if not exists
    r_initial = requests.post(
        BASE_URL + REGISTER_ENDPOINT,
        json=register_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    # Accept either successful registration or conflict if already registered
    assert r_initial.status_code in (200, 409)

    # Now attempt to register again with the same email to trigger error
    r = requests.post(
        BASE_URL + REGISTER_ENDPOINT,
        json=register_payload,
        headers=headers,
        timeout=TIMEOUT
    )

    # We expect an error response indicating account cannot be created
    assert r.status_code in (400, 409)
    # Content-Type should be JSON (assumption)
    assert 'application/json' in r.headers.get('Content-Type', '')

    json_response = r.json()

    # Check typical keys for error message
    error_indicators = ['error', 'message', 'detail']
    assert any(key in json_response for key in error_indicators)

test_postapiauthregisterwithexistingemail()