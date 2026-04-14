def test_get_profile_creates_if_not_exists(client):
    response = client.get("/api/profile")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "test-user-id"
    assert data["preferred_language"] == "fr"


def test_update_profile_instructions(client):
    client.get("/api/profile")  # ensure profile exists
    response = client.put("/api/profile", json={
        "generation_instructions": "Write in a formal tone. Focus on technical skills.",
        "preferred_language": "en",
    })
    assert response.status_code == 200
    assert response.json()["generation_instructions"] == "Write in a formal tone. Focus on technical skills."
    assert response.json()["preferred_language"] == "en"
