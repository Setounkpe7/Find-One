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


def test_jsearch_returns_results(client):
    mock_results = [
        {"job_title": "Python Dev", "employer_name": "Tech Co", "job_apply_link": "https://example.com/apply"},
    ]
    with patch("app.services.jsearch.search_jobs", return_value=mock_results):
        response = client.get("/api/search/jobs?query=python+developer&page=1")
    assert response.status_code == 200
    assert len(response.json()) >= 1
