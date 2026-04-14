import enum
import uuid
from sqlalchemy import Column, String, Enum, DateTime
from sqlalchemy.sql import func
from app.database import Base


class FileType(str, enum.Enum):
    pdf = "pdf"
    docx = "docx"


class Template(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    job_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(Enum(FileType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
