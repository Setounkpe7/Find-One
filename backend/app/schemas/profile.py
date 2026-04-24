from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserProfileOut(BaseModel):
    user_id: str
    generation_instructions: Optional[str] = None
    preferred_language: str = "fr"

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    generation_instructions: Optional[str] = None
    preferred_language: Optional[str] = None
