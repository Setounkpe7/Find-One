import httpx
from app.config import settings


def search_jobs(query: str, page: int = 1) -> list[dict]:
    url = "https://jsearch.p.rapidapi.com/search"
    headers = {
        "X-RapidAPI-Key": settings.jsearch_api_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }
    params = {"query": query, "page": str(page), "num_pages": "1"}

    try:
        response = httpx.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        return [{"error": str(e)}]

    jobs = []
    for item in data.get("data", []):
        jobs.append({
            "title": item.get("job_title", ""),
            "company": item.get("employer_name", ""),
            "location": item.get("job_city", "") + ", " + item.get("job_country", ""),
            "url": item.get("job_apply_link", ""),
            "description": item.get("job_description", "")[:500],
            "source": "jsearch",
        })
    return jobs
