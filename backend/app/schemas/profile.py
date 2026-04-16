from typing import Optional
from pydantic import BaseModel


class UserProfileOut(BaseModel):
    user_id: str
    generation_instructions: Optional[str] = None
    preferred_language: str = "fr"

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    generation_instructions: Optional[str] = None
    preferred_language: Optional[str] = None
