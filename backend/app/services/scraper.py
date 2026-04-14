import httpx
from bs4 import BeautifulSoup


def scrape_url(url: str) -> dict:
    try:
        response = httpx.get(url, timeout=10, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (compatible; Find-One/1.0)"
        })
        response.raise_for_status()
    except Exception as e:
        return {"url": url, "error": str(e)}

    soup = BeautifulSoup(response.text, "html.parser")

    title = ""
    if soup.title:
        title = soup.title.string or ""
    for tag in soup.find_all(["h1", "h2"]):
        if tag.text.strip():
            title = tag.text.strip()
            break

    meta_desc = soup.find("meta", {"name": "description"})
    description = meta_desc["content"] if meta_desc and meta_desc.get("content") else ""

    return {
        "url": url,
        "title": title[:200],
        "description": description[:1000],
        "company": "",
        "location": "",
    }
