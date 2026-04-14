from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from app.deps import get_current_user
from app.services.scraper import scrape_url
from app.services.jsearch import search_jobs

router = APIRouter(prefix="/api/search", tags=["search"])


class UrlImportRequest(BaseModel):
    url: str


@router.post("/url")
def import_from_url(body: UrlImportRequest, user: dict = Depends(get_current_user)):
    return scrape_url(body.url)


@router.get("/jobs")
def search(
    query: str = Query(..., min_length=2),
    page: int = Query(1, ge=1),
    user: dict = Depends(get_current_user),
):
    return search_jobs(query, page)
