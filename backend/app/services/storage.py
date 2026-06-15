import os
import tempfile
import uuid
import logging
from supabase import create_client
from app.config import settings

logger = logging.getLogger(__name__)

DEFAULT_BUCKET = "templates"


def _use_supabase() -> bool:
    """Supabase Storage is used only when both URL and service key are set."""
    return bool(settings.supabase_url and settings.supabase_service_key)


def _client():
    return create_client(settings.supabase_url, settings.supabase_service_key)


def _local_path(filename: str, bucket: str) -> str:
    safe_name = os.path.basename(filename).replace(" ", "_")
    return os.path.join(
        tempfile.gettempdir(), "findone", bucket, f"{uuid.uuid4()}_{safe_name}"
    )


def _ensure_bucket(client, bucket: str) -> None:
    """Best-effort: create the private bucket if it doesn't exist yet.

    Self-provisions storage on deployments whose service key has bucket-admin
    rights. Where it doesn't (RLS-restricted key), the create fails here and the
    subsequent upload raises a StorageException that upload_file surfaces — the
    bucket then has to be created once in the Supabase dashboard.
    """
    try:
        client.storage.get_bucket(bucket)
        return
    except Exception:
        pass
    try:
        client.storage.create_bucket(bucket, options={"public": False})
    except Exception as exc:  # already exists (race) or insufficient rights
        logger.warning("Could not ensure storage bucket %r: %s", bucket, exc)


def upload_file(file_bytes: bytes, filename: str, bucket: str = DEFAULT_BUCKET) -> str:
    """Store bytes and return a reference readable back by read_file().

    Supabase mode returns the object key; local fallback returns an absolute path.
    """
    if not _use_supabase():
        path = _local_path(filename, bucket)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(file_bytes)
        return path

    client = _client()
    _ensure_bucket(client, bucket)
    safe_name = os.path.basename(filename).replace(" ", "_")
    key = f"{uuid.uuid4()}_{safe_name}"
    client.storage.from_(bucket).upload(key, file_bytes)
    return key


def read_file(ref: str, bucket: str = DEFAULT_BUCKET) -> bytes:
    """Read back bytes for a reference produced by upload_file()."""
    if not _use_supabase():
        with open(ref, "rb") as f:
            return f.read()
    return _client().storage.from_(bucket).download(ref)
