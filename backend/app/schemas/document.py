from typing import Optional
from pydantic import BaseModel
from app.models.generated_doc import DocType


class GenerateDocRequest(BaseModel):
    job_offer_id: str
    doc_type: DocType
    language: str = "fr"
    template_id: Optional[str] = None


class GeneratedDocOut(BaseModel):
    id: str
    user_id: str
    job_offer_id: Optional[str] = None
    doc_type: DocType
    language: str
    content: Optional[str] = None
    file_path: Optional[str] = None

    model_config = {"from_attributes": True}
