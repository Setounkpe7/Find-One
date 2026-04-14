from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models.job_offer import JobOffer
from app.models.template import Template
from app.models.user_profile import UserProfile
from app.models.generated_doc import GeneratedDocument
from app.schemas.document import GenerateDocRequest
from app.services.doc_generator import build_prompt, stream_generation
from app.services.template_parser import parse_template

router = APIRouter(prefix="/api/documents", tags=["documents"])


def _find_best_template(user_id: str, job_type: str, template_id: str | None, db: Session) -> tuple[str, str | None]:
    if template_id:
        tmpl = db.query(Template).filter(Template.id == template_id, Template.user_id == user_id).first()
        if tmpl:
            return parse_template(tmpl.file_path, tmpl.file_type.value), tmpl.id

    tmpl = db.query(Template).filter(Template.user_id == user_id, Template.job_type == job_type).first()
    if tmpl:
        return parse_template(tmpl.file_path, tmpl.file_type.value), tmpl.id

    tmpl = db.query(Template).filter(Template.user_id == user_id).first()
    if tmpl:
        return parse_template(tmpl.file_path, tmpl.file_type.value), tmpl.id

    return "", None


@router.post("/generate")
async def generate_document(
    body: GenerateDocRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    offer = db.query(JobOffer).filter(JobOffer.id == body.job_offer_id, JobOffer.user_id == user["user_id"]).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    profile = db.query(UserProfile).filter(UserProfile.user_id == user["user_id"]).first()
    instructions = profile.generation_instructions if profile else ""

    template_content, used_template_id = _find_best_template(
        user["user_id"], offer.title, body.template_id, db
    )

    prompt = build_prompt(
        job_title=offer.title,
        company=offer.company,
        doc_type=body.doc_type.value,
        language=body.language,
        user_instructions=instructions or "",
        template_content=template_content,
        job_description=offer.notes or "",
    )

    doc = GeneratedDocument(
        user_id=user["user_id"],
        job_offer_id=offer.id,
        template_id=used_template_id,
        doc_type=body.doc_type,
        language=body.language,
        instructions_snapshot=instructions,
    )
    db.add(doc)
    db.commit()

    async def generate():
        full_content = []
        async for chunk in stream_generation(prompt, instructions, template_content):
            full_content.append(chunk)
            yield f"data: {chunk}\n\n"
        doc.content = "".join(full_content)
        db.commit()
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
