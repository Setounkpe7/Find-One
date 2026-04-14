from app.deps import get_current_user


def test_create_job_offer(client):
    response = client.post("/api/jobs", json={
        "title": "Backend Developer",
        "company": "Acme Corp",
        "status": "to_apply",
        "source": "manual",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Backend Developer"
    assert data["id"] is not None


def test_list_job_offers(client):
    client.post("/api/jobs", json={"title": "Job A", "company": "Co A", "status": "to_apply", "source": "manual"})
    client.post("/api/jobs", json={"title": "Job B", "company": "Co B", "status": "applied", "source": "manual"})
    response = client.get("/api/jobs")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_update_job_offer(client):
    create = client.post("/api/jobs", json={"title": "Old Title", "company": "Co", "status": "to_apply", "source": "manual"})
    job_id = create.json()["id"]
    response = client.put(f"/api/jobs/{job_id}", json={"title": "New Title"})
    assert response.status_code == 200
    assert response.json()["title"] == "New Title"


def test_delete_job_offer(client):
    create = client.post("/api/jobs", json={"title": "To Delete", "company": "Co", "status": "to_apply", "source": "manual"})
    job_id = create.json()["id"]
    response = client.delete(f"/api/jobs/{job_id}")
    assert response.status_code == 204
    get = client.get(f"/api/jobs/{job_id}")
    assert get.status_code == 404


def test_cannot_access_other_users_job(client):
    create = client.post("/api/jobs", json={"title": "My Job", "company": "Co", "status": "to_apply", "source": "manual"})
    job_id = create.json()["id"]
    original = client.app.dependency_overrides[get_current_user]
    client.app.dependency_overrides[get_current_user] = lambda: {"user_id": "other-user", "email": "other@example.com"}
    try:
        response = client.get(f"/api/jobs/{job_id}")
        assert response.status_code == 404
    finally:
        client.app.dependency_overrides[get_current_user] = original
