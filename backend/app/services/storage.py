import os
import uuid
from supabase import create_client
from app.config import settings


def upload_file(file_bytes: bytes, filename: str, bucket: str = "templates") -> str:
    if not settings.supabase_url or not settings.supabase_service_key:
        path = f"/tmp/findone/{bucket}/{uuid.uuid4()}_{filename}"
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(file_bytes)
        return path

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    path = f"{uuid.uuid4()}_{filename}"
    client.storage.from_(bucket).upload(path, file_bytes)
    return path


def get_signed_url(path: str, bucket: str = "templates", expires_in: int = 3600) -> str:
    if not settings.supabase_url:
        return path
    client = create_client(settings.supabase_url, settings.supabase_service_key)
    result = client.storage.from_(bucket).create_signed_url(path, expires_in)
    return result["signedURL"]
