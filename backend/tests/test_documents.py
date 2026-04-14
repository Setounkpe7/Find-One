from unittest.mock import patch, MagicMock


def test_generate_document_requires_valid_request(client):
    response = client.post("/api/documents/generate", json={})
    assert response.status_code == 422  # Pydantic validation fails on missing fields


def test_generate_document_streams_response(client, db):
    from app.models.job_offer import JobOffer
    # Seed a job offer so the route doesn't 404
    job = JobOffer(id="job-1", user_id="test-user-id", title="Dev", company="Acme", status="applied")
    db.add(job)
    db.commit()

    mock_stream_chunks = ["Hello ", "world", "!"]

    async def fake_stream(prompt):
        for chunk in mock_stream_chunks:
            yield chunk

    with patch("app.api.documents.stream_generation", side_effect=fake_stream):
        response = client.post("/api/documents/generate", json={
            "job_offer_id": "job-1",
            "doc_type": "cv",
            "language": "fr",
        })
    assert response.status_code == 200
    assert "Hello " in response.text
    assert "[DONE]" in response.text


def test_generation_prompt_includes_job_details(client):
    """Verify the prompt builder includes job title and company."""
    from app.services.doc_generator import build_prompt
    prompt = build_prompt(
        job_title="Python Developer",
        company="Acme",
        doc_type="cv",
        language="fr",
        user_instructions="Be formal.",
        template_content="[template content]",
        job_description="Build APIs.",
    )
    assert "Python Developer" in prompt
    assert "Acme" in prompt
    assert "Be formal." in prompt
