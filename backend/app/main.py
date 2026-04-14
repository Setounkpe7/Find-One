from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.api.auth import router as auth_router
from app.api import jobs as jobs_router
from app.api import profile as profile_router

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Find-One API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(jobs_router.router)
app.include_router(profile_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
