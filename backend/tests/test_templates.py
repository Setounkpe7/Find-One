import io
from unittest.mock import patch


def test_list_templates_empty(client):
    response = client.get("/api/templates")
    assert response.status_code == 200
    assert response.json() == []


def test_upload_template(client):
    fake_pdf = io.BytesIO(b"%PDF-1.4 fake pdf content")
    with patch("app.api.templates.parse_template", return_value="Extracted content"):
        with patch("app.api.templates.upload_file", return_value="storage/templates/test.pdf"):
            response = client.post(
                "/api/templates",
                data={"name": "Backend CV", "job_type": "backend_developer"},
                files={"file": ("cv_template.pdf", fake_pdf, "application/pdf")},
            )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Backend CV"
    assert data["job_type"] == "backend_developer"


def test_delete_template(client):
    fake_pdf = io.BytesIO(b"%PDF-1.4 fake pdf content")
    with patch("app.api.templates.parse_template", return_value="content"):
        with patch("app.api.templates.upload_file", return_value="path/to/file"):
            create = client.post(
                "/api/templates",
                data={"name": "To Delete", "job_type": "data_science"},
                files={"file": ("template.pdf", fake_pdf, "application/pdf")},
            )
    template_id = create.json()["id"]
    response = client.delete(f"/api/templates/{template_id}")
    assert response.status_code == 204
