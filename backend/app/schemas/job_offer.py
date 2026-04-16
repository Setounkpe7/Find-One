from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.job_offer import JobStatus, ContractType, JobSource


class JobOfferCreate(BaseModel):
    title: str
    company: str
    url: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    contract_type: Optional[ContractType] = None
    recruiter_name: Optional[str] = None
    status: JobStatus = JobStatus.to_apply
    applied_at: Optional[date] = None
    followup_date: Optional[date] = None
    interview_date: Optional[date] = None
    notes: Optional[str] = None
    source: JobSource = JobSource.manual


class JobOfferUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    url: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    contract_type: Optional[ContractType] = None
    recruiter_name: Optional[str] = None
    status: Optional[JobStatus] = None
    applied_at: Optional[date] = None
    followup_date: Optional[date] = None
    interview_date: Optional[date] = None
    notes: Optional[str] = None


class JobOfferOut(BaseModel):
    id: str
    user_id: str
    title: str
    company: str
    url: Optional[str]
    location: Optional[str]
    salary: Optional[str]
    contract_type: Optional[ContractType]
    recruiter_name: Optional[str]
    status: JobStatus
    applied_at: Optional[date]
    followup_date: Optional[date]
    interview_date: Optional[date]
    notes: Optional[str]
    source: JobSource

    model_config = ConfigDict(from_attributes=True)
