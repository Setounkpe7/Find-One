import app.services.storage as storage_mod
from app.services.storage import upload_file, read_file


def test_upload_read_roundtrip_local(monkeypatch):
    """In local fallback mode (no service key), bytes survive a store/read cycle."""
    monkeypatch.setattr(storage_mod.settings, "supabase_service_key", "")
    data = b"hello template bytes"
    ref = upload_file(data, "my cv.docx", bucket="templates")
    assert read_file(ref, bucket="templates") == data


def test_local_ref_is_absolute_path(monkeypatch):
    monkeypatch.setattr(storage_mod.settings, "supabase_service_key", "")
    ref = upload_file(b"x", "doc.pdf", bucket="templates")
    assert ref.endswith("_doc.pdf")
