from unittest.mock import patch, MagicMock


def test_scrape_url_returns_job_data(client):
    mock_html = """
    <html><head><title>Backend Developer at Acme</title></head>
    <body><h1>Backend Developer</h1><p>Acme Corp</p><p>Paris, France</p></body>
    </html>
    """
    with patch("app.services.scraper.httpx.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200, text=mock_html)
        response = client.post("/api/search/url", json={"url": "https://example.com/job/123"})
    assert response.status_code == 200
    data = response.json()
    assert "title" in data


def test_scrape_url_rejects_non_http_scheme(client):
    response = client.post("/api/search/url", json={"url": "file:///etc/passwd"})
    assert response.status_code == 422


def test_jsearch_returns_results(client):
    mock_results = [
        {"job_title": "Python Dev", "employer_name": "Tech Co", "job_apply_link": "https://example.com/apply"},
    ]
    with patch("app.api.search.search_jobs", return_value=mock_results):
        response = client.get("/api/search/jobs?query=python+developer&page=1")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_search_jobs_handles_null_fields():
    """JSearch returns items with null city/country/description; must not raise."""
    from app.services.jsearch import search_jobs

    payload = {
        "data": [
            {
                "job_title": "Dev",
                "employer_name": "Acme",
                "job_city": None,
                "job_country": None,
                "job_apply_link": None,
                "job_description": None,
            }
        ]
    }
    resp = MagicMock(status_code=200)
    resp.json.return_value = payload
    resp.raise_for_status.return_value = None

    with patch("app.services.jsearch.httpx.get", return_value=resp):
        out = search_jobs("dev", 1)

    assert len(out) == 1
    assert out[0]["company"] == "Acme"
    assert out[0]["location"] == ""
    assert out[0]["description"] == ""
    assert out[0]["url"] == ""


def test_search_jobs_joins_city_and_country():
    from app.services.jsearch import search_jobs

    payload = {"data": [{"job_title": "Dev", "job_city": "Paris", "job_country": "France"}]}
    resp = MagicMock(status_code=200)
    resp.json.return_value = payload
    resp.raise_for_status.return_value = None

    with patch("app.services.jsearch.httpx.get", return_value=resp):
        out = search_jobs("dev", 1)

    assert out[0]["location"] == "Paris, France"
