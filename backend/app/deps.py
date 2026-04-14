from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    # Implemented fully in Task 6 (JWT validation)
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED)
