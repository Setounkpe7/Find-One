"""Contract tests: every request-bearing API call the frontend makes must
have at least one case here that posts the exact shape the frontend
produces. Paired with ``model_config = ConfigDict(extra="forbid")`` on
each input schema, this catches contract drift between frontend and
backend at unit-test time — the regression mode that let the Profile
field-name mismatch ship to prod unnoticed.

Source-of-truth mapping:

- ``frontend/src/pages/Profile.tsx``  → PUT ``/api/profile``
- ``frontend/src/components/JobForm.tsx`` → POST / PUT ``/api/jobs``
- ``frontend/src/components/DocViewer.tsx`` → POST ``/api/documents/generate``
- ``frontend/src/pages/JobSearch.tsx`` → POST ``/api/search/url``

If a frontend payload changes, update the matching test first — the
test should fail against the old schema, forcing a deliberate contract
change rather than a silent drift.
"""
from unittest.mock import MagicMock, patch


# --- PUT /api/profile ----------------------------------------------------


def test_profile_accepts_frontend_shape(client):
    """Profile.tsx sends `{generation_instructions, preferred_language}`."""
    client.get("/api/profile")
    response = client.put(
        "/api/profile",
        json={
            "generation_instructions": "Be concise and senior.",
            "preferred_language": "en",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["generation_instructions"] == "Be concise and senior."
    assert data["preferred_language"] == "en"


def test_profile_rejects_pre_fix_frontend_shape(client):
    """The shape the frontend was sending BEFORE #31 (`instructions` /
    `language`) must now explode loudly instead of silently dropping the
    payload on the floor."""
    client.get("/api/profile")
    response = client.put(
        "/api/profile",
        json={"instructions": "ignored", "language": "en"},
    )
    assert response.status_code == 422


def test_profile_rejects_unknown_field(client):
    client.get("/api/profile")
    response = client.put(
        "/api/profile",
        json={"generation_instructions": "ok", "unexpected": "value"},
    )
    assert response.status_code == 422


# --- POST /api/jobs ------------------------------------------------------


def _jobform_payload(**overrides):
    """Mirror JobForm.tsx's payload-build step: merge the form defaults,
    drop empty strings (the form does `if (value !== '')`), apply any
    test-specific overrides."""
    base = {
        "title": "Backend Engineer",
        "company": "Acme",
        "url": "https://acme.example/offer",
        "location": "Paris",
        "salary": "55 000 €",
        "contract_type": "cdi",
        "recruiter_name": "Marie Dupont",
        "status": "to_apply",
        "applied_at": "2026-04-20",
        "followup_date": "",
        "interview_date": "",
        "notes": "Top pick",
    }
    base.update(overrides)
    return {k: v for k, v in base.items() if v != ""}


def test_create_job_accepts_full_frontend_payload(client):
    response = client.post("/api/jobs", json=_jobform_payload())
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Backend Engineer"
    assert data["contract_type"] == "cdi"
    assert data["status"] == "to_apply"
    assert data["source"] == "manual"  # server default


def test_create_job_accepts_minimal_required_fields(client):
    response = client.post(
        "/api/jobs",
        json={"title": "Data Analyst", "company": "Startup"},
    )
    assert response.status_code == 201


def test_create_job_rejects_pre_fix_enum_values(client):
    """`saved` and `withdrawn` were in JobForm.tsx's STATUSES array but
    never existed in the backend enum. Same for 'CDI' (uppercase) vs the
    Postgres `cdi`. These tests lock the fix in place."""
    for bad_status in ("saved", "withdrawn"):
        response = client.post(
            "/api/jobs",
            json=_jobform_payload(status=bad_status),
        )
        assert response.status_code == 422, f"expected 422 for status={bad_status}"

    for bad_contract in ("CDI", "Stage", "Alternance"):
        response = client.post(
            "/api/jobs",
            json=_jobform_payload(contract_type=bad_contract),
        )
        assert response.status_code == 422, f"expected 422 for contract_type={bad_contract}"


def test_create_job_rejects_unknown_field(client):
    response = client.post(
        "/api/jobs",
        json=_jobform_payload(extra_field="nope"),
    )
    assert response.status_code == 422


# --- PUT /api/jobs/:id ---------------------------------------------------


def test_update_job_accepts_partial_frontend_payload(client):
    created = client.post(
        "/api/jobs",
        json={"title": "Dev", "company": "Acme"},
    ).json()
    response = client.put(
        f"/api/jobs/{created['id']}",
        json={"status": "interview_scheduled", "interview_date": "2026-05-10"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "interview_scheduled"


def test_update_job_rejects_unknown_field(client):
    created = client.post(
        "/api/jobs",
        json={"title": "Dev", "company": "Acme"},
    ).json()
    response = client.put(
        f"/api/jobs/{created['id']}",
        json={"status": "applied", "unexpected": "x"},
    )
    assert response.status_code == 422


# --- POST /api/documents/generate ---------------------------------------


def test_generate_document_accepts_frontend_shape(client, db):
    """DocViewer.tsx sends `{job_offer_id, doc_type, language, template_id?}`."""
    from app.models.job_offer import JobOffer

    db.add(
        JobOffer(
            id="job-contract-1",
            user_id="test-user-id",
            title="Dev",
            company="Acme",
            status="applied",
        )
    )
    db.commit()

    async def fake_stream(_prompt):
        yield "ok"

    with patch("app.api.documents.stream_generation", side_effect=fake_stream):
        response = client.post(
            "/api/documents/generate",
            json={
                "job_offer_id": "job-contract-1",
                "doc_type": "cv",
                "language": "fr",
            },
        )
    assert response.status_code == 200


def test_generate_document_rejects_unknown_field(client):
    response = client.post(
        "/api/documents/generate",
        json={
            "job_offer_id": "x",
            "doc_type": "cv",
            "language": "fr",
            "unexpected": "value",
        },
    )
    assert response.status_code == 422


# --- POST /api/search/url ------------------------------------------------


def test_search_url_accepts_frontend_shape(client):
    """JobSearch.tsx sends `{url}`."""
    mock_html = "<html><head><title>Offer</title></head><body></body></html>"
    with patch("app.services.scraper.httpx.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200, text=mock_html)
        response = client.post(
            "/api/search/url",
            json={"url": "https://example.com/job/1"},
        )
    assert response.status_code == 200


def test_search_url_rejects_unknown_field(client):
    response = client.post(
        "/api/search/url",
        json={"url": "https://example.com/", "unexpected": "x"},
    )
    assert response.status_code == 422
