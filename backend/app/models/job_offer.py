import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, Date
from sqlalchemy.sql import func
from app.database import Base


class JobStatus(str, enum.Enum):
    to_apply = "to_apply"
    applied = "applied"
    interview_scheduled = "interview_scheduled"
    rejected = "rejected"
    offer_received = "offer_received"
    abandoned = "abandoned"


class ContractType(str, enum.Enum):
    cdi = "cdi"
    cdd = "cdd"
    freelance = "freelance"


class JobSource(str, enum.Enum):
    manual = "manual"
    url = "url"
    jsearch = "jsearch"


class JobOffer(Base):
    __tablename__ = "job_offers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    url = Column(String, nullable=True)
    location = Column(String, nullable=True)
    salary = Column(String, nullable=True)
    contract_type = Column(Enum(ContractType), nullable=True)
    recruiter_name = Column(String, nullable=True)
    status = Column(Enum(JobStatus), nullable=False, default=JobStatus.to_apply)
    applied_at = Column(Date, nullable=True)
    followup_date = Column(Date, nullable=True)
    interview_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    source = Column(Enum(JobSource), nullable=False, default=JobSource.manual)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
