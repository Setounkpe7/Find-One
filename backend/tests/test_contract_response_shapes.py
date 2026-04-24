"""Contract tests: response-shape direction (backend → frontend).

Sibling to ``test_contract_frontend_payloads.py`` which locks the
request shape. This file locks the response shape — the set of keys
the frontend actually reads on each endpoint. A rename or removal on
the backend that drops a key the frontend consumes will fail one of
these tests, surfacing the drift before it silently shows a blank
field in prod (the exact regression mode that let ``generation_instructions``
vs ``instructions`` ship undetected before #31).

The ``EXPECTED_*_KEYS`` sets below come from grepping the frontend for
attribute reads on each response object:

- ``EXPECTED_PROFILE_KEYS`` ← ``Profile.tsx`` (`data.generation_instructions`,
  `data.preferred_language`).
- ``EXPECTED_JOB_OFFER_KEYS`` ← ``JobOffer`` interface in
  ``frontend/src/lib/types.ts``.
- ``EXPECTED_TEMPLATE_KEYS`` ← ``Templates.tsx`` attribute reads.
- ``EXPECTED_SEARCH_RESULT_KEYS`` ← ``SearchResult`` interface in
  ``frontend/src/pages/JobSearch.tsx``.

If the frontend stops reading a key, remove it from the expected set
here. If the frontend starts reading a new key, add it here first and
the test will fail until the backend returns it.
"""
from unittest.mock import MagicMock, patch


EXPECTED_PROFILE_KEYS = {
    "user_id",
    "generation_instructions",
    "preferred_language",
}

EXPECTED_JOB_OFFER_KEYS = {
    "id",
    "title",
    "company",
    "url",
    "location",
    "salary",
    "contract_type",
    "recruiter_name",
    "status",
    "applied_at",
    "followup_date",
    "interview_date",
    "notes",
}

EXPECTED_TEMPLATE_KEYS = {
    "id",
    "name",
    "job_type",
    "file_type",
    "file_path",
}

EXPECTED_SEARCH_RESULT_KEYS = {
    "title",
    "company",
    "url",
    "location",
    "description",
}


def _assert_contains_keys(obj: dict, expected: set[str], endpoint: str) -> None:
    missing = expected - set(obj.keys())
    assert not missing, (
        f"{endpoint} response is missing keys the frontend reads: {sorted(missing)}. "
        f"Actual keys: {sorted(obj.keys())}"
    )


# --- GET /api/profile ----------------------------------------------------


def test_get_profile_returns_frontend_keys(client):
    response = client.get("/api/profile")
    assert response.status_code == 200
    _assert_contains_keys(response.json(), EXPECTED_PROFILE_KEYS, "GET /api/profile")


def test_put_profile_returns_frontend_keys(client):
    client.get("/api/profile")
    response = client.put(
        "/api/profile",
        json={"generation_instructions": "x", "preferred_language": "fr"},
    )
    assert response.status_code == 200
    _assert_contains_keys(response.json(), EXPECTED_PROFILE_KEYS, "PUT /api/profile")


# --- GET /api/jobs & /api/jobs/:id --------------------------------------


def test_list_jobs_items_return_frontend_keys(client):
    client.post("/api/jobs", json={"title": "Dev", "company": "Acme"})
    response = client.get("/api/jobs")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    _assert_contains_keys(
        response.json()[0], EXPECTED_JOB_OFFER_KEYS, "GET /api/jobs[]"
    )


def test_get_job_detail_returns_frontend_keys(client):
    created = client.post("/api/jobs", json={"title": "Dev", "company": "Acme"}).json()
    response = client.get(f"/api/jobs/{created['id']}")
    assert response.status_code == 200
    _assert_contains_keys(
        response.json(), EXPECTED_JOB_OFFER_KEYS, "GET /api/jobs/:id"
    )


def test_post_job_returns_frontend_keys(client):
    response = client.post("/api/jobs", json={"title": "Dev", "company": "Acme"})
    assert response.status_code == 201
    _assert_contains_keys(
        response.json(), EXPECTED_JOB_OFFER_KEYS, "POST /api/jobs"
    )


def test_put_job_returns_frontend_keys(client):
    created = client.post("/api/jobs", json={"title": "Dev", "company": "Acme"}).json()
    response = client.put(
        f"/api/jobs/{created['id']}",
        json={"status": "interview_scheduled"},
    )
    assert response.status_code == 200
    _assert_contains_keys(
        response.json(), EXPECTED_JOB_OFFER_KEYS, "PUT /api/jobs/:id"
    )


# --- GET /api/templates -------------------------------------------------


def test_list_templates_items_return_frontend_keys(client):
    import io
    fake_pdf = io.BytesIO(b"%PDF-1.4 fake")
    with patch("app.api.templates.parse_template", return_value="content"):
        with patch("app.api.templates.upload_file", return_value="path/tpl.pdf"):
            client.post(
                "/api/templates",
                data={"name": "CV", "job_type": "dev"},
                files={"file": ("cv.pdf", fake_pdf, "application/pdf")},
            )
    response = client.get("/api/templates")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    _assert_contains_keys(
        response.json()[0], EXPECTED_TEMPLATE_KEYS, "GET /api/templates[]"
    )


# --- POST /api/search/url & GET /api/search/jobs ------------------------


def test_search_url_returns_searchresult_keys(client):
    mock_html = (
        "<html><head><title>Offer</title>"
        "<meta name='description' content='Good offer'>"
        "</head><body><h1>Role</h1></body></html>"
    )
    with patch("app.services.scraper.httpx.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200, text=mock_html)
        response = client.post(
            "/api/search/url",
            json={"url": "https://example.com/job/1"},
        )
    assert response.status_code == 200
    _assert_contains_keys(
        response.json(), EXPECTED_SEARCH_RESULT_KEYS, "POST /api/search/url"
    )


def test_search_jobs_items_return_searchresult_keys(client):
    mock_results = [
        {
            "title": "Python Dev",
            "company": "Tech Co",
            "location": "Paris, FR",
            "url": "https://example.com/apply",
            "description": "Build APIs.",
            "source": "jsearch",
        }
    ]
    with patch("app.api.search.search_jobs", return_value=mock_results):
        response = client.get("/api/search/jobs?query=python+dev")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    _assert_contains_keys(data[0], EXPECTED_SEARCH_RESULT_KEYS, "GET /api/search/jobs[]")
