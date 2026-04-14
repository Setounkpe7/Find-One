# Vercel serverless entry point — imports the FastAPI app
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app  # noqa: F401 — Vercel uses this as the ASGI handler
