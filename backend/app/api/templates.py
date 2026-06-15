import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models.template import Template, FileType
from app.schemas.template import TemplateOut
from app.services.template_parser import parse_template_bytes
from app.services.storage import upload_file

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/templates", tags=["templates"])

ALLOWED_EXTENSIONS = {"pdf", "docx"}


@router.get("", response_model=list[TemplateOut])
def list_templates(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    return db.query(Template).filter(Template.user_id == user["user_id"]).all()


@router.post("", response_model=TemplateOut, status_code=201)
async def upload_template(
    name: str = Form(...),
    job_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are accepted")

    file_bytes = await file.read()

    try:
        parse_template_bytes(file_bytes, ext)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    try:
        file_path = upload_file(file_bytes, filename)
    except Exception as e:
        logger.error("Template upload to storage failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail="File storage is unavailable. Please try again later.",
        )

    template = Template(
        user_id=user["user_id"],
        name=name,
        job_type=job_type,
        file_path=file_path,
        file_type=FileType(ext),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    template = (
        db.query(Template)
        .filter(Template.id == template_id, Template.user_id == user["user_id"])
        .first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
