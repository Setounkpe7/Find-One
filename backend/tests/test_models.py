from app.models.job_offer import JobOffer, ContractType, JobStatus
from app.models.user_profile import UserProfile
from app.models.template import Template, FileType
from app.models.generated_doc import GeneratedDocument, DocType


def test_job_offer_model_columns(db):
    offer = JobOffer(
        user_id="user-1",
        title="Backend Developer",
        company="Acme Corp",
        status=JobStatus.to_apply,
        source="manual",
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    assert offer.id is not None
    assert offer.title == "Backend Developer"
    assert offer.status == JobStatus.to_apply


def test_user_profile_model(db):
    profile = UserProfile(
        user_id="user-1",
        generation_instructions="Write in a formal tone.",
        preferred_language="fr",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    assert profile.user_id == "user-1"
