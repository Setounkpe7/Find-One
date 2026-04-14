import os
import uuid
from supabase import create_client
from app.config import settings


def upload_file(file_bytes: bytes, filename: str, bucket: str = "templates") -> str:
    if not settings.supabase_url or not settings.supabase_service_key:
        safe_name = os.path.basename(filename).replace(" ", "_")
        path = f"/tmp/findone/{bucket}/{uuid.uuid4()}_{safe_name}"
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(file_bytes)
        return path

    client = create_client(settings.supabase_url, settings.supabase_service_key)
    safe_name = os.path.basename(filename).replace(" ", "_")
    path = f"{uuid.uuid4()}_{safe_name}"
    client.storage.from_(bucket).upload(path, file_bytes)
    return path
