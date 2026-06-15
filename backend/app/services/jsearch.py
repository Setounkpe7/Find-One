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
        city = (item.get("job_city") or "").strip()
        country = (item.get("job_country") or "").strip()
        location = ", ".join(part for part in (city, country) if part)
        jobs.append({
            "title": item.get("job_title") or "",
            "company": item.get("employer_name") or "",
            "location": location,
            "url": item.get("job_apply_link") or "",
            "description": (item.get("job_description") or "")[:500],
            "source": "jsearch",
        })
    return jobs
