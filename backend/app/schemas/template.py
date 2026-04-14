from pydantic import BaseModel
from app.models.template import FileType


class TemplateOut(BaseModel):
    id: str
    user_id: str
    name: str
    job_type: str
    file_path: str
    file_type: FileType

    model_config = {"from_attributes": True}
