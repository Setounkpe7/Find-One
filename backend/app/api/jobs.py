from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models.job_offer import JobOffer
from app.schemas.job_offer import JobOfferCreate, JobOfferUpdate, JobOfferOut

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("", response_model=JobOfferOut, status_code=201)
def create_job(
    body: JobOfferCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    offer = JobOffer(**body.model_dump(exclude_unset=True), user_id=user["user_id"])
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


@router.get("", response_model=list[JobOfferOut])
def list_jobs(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    return db.query(JobOffer).filter(JobOffer.user_id == user["user_id"]).all()


@router.get("/{job_id}", response_model=JobOfferOut)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    offer = db.query(JobOffer).filter(JobOffer.id == job_id, JobOffer.user_id == user["user_id"]).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")
    return offer


@router.put("/{job_id}", response_model=JobOfferOut)
def update_job(
    job_id: str,
    body: JobOfferUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    offer = db.query(JobOffer).filter(JobOffer.id == job_id, JobOffer.user_id == user["user_id"]).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(offer, field, value)
    db.commit()
    db.refresh(offer)
    return offer


@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    offer = db.query(JobOffer).filter(JobOffer.id == job_id, JobOffer.user_id == user["user_id"]).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")
    db.delete(offer)
    db.commit()
