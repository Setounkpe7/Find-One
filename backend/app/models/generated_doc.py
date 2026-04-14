import enum
import uuid
from sqlalchemy import Column, String, Text, Enum, DateTime
from sqlalchemy.sql import func
from app.database import Base


class DocType(str, enum.Enum):
    cv = "cv"
    cover_letter = "cover_letter"


class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    job_offer_id = Column(String, nullable=True)
    template_id = Column(String, nullable=True)
    doc_type = Column(Enum(DocType), nullable=False)
    language = Column(String, nullable=False, default="fr")
    content = Column(Text, nullable=True)
    file_path = Column(String, nullable=True)
    instructions_snapshot = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
