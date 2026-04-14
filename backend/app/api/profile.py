from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models.user_profile import UserProfile
from app.schemas.profile import UserProfileOut, UserProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _get_or_create_profile(user_id: str, db: Session) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("", response_model=UserProfileOut)
def get_profile(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    return _get_or_create_profile(user["user_id"], db)


@router.put("", response_model=UserProfileOut)
def update_profile(
    body: UserProfileUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    profile = _get_or_create_profile(user["user_id"], db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
