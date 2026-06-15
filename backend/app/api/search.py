from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, field_validator
from app.deps import get_current_user
from app.limiter import limiter
from app.services.scraper import scrape_url
from app.services.jsearch import search_jobs

router = APIRouter(prefix="/api/search", tags=["search"])


class UrlImportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str

    @field_validator("url")
    @classmethod
    def must_be_http(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("Only http and https URLs are allowed")
        return v


@router.post("/url")
@limiter.limit("60/hour")
def import_from_url(
    request: Request,
    body: UrlImportRequest,
    user: dict = Depends(get_current_user),
):
    return scrape_url(body.url)


@router.get("/jobs")
@limiter.limit("60/hour")
def search(
    request: Request,
    query: str = Query(..., min_length=2),
    page: int = Query(1, ge=1),
    user: dict = Depends(get_current_user),
):
    return search_jobs(query, page)
