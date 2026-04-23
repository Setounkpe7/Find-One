"""initial schema

Revision ID: 9a22ed8c7e07
Revises:
Create Date: 2026-04-13 20:25:21.514039

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9a22ed8c7e07"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


JOB_STATUS_VALUES = (
    "to_apply",
    "applied",
    "interview_scheduled",
    "rejected",
    "offer_received",
    "abandoned",
)
CONTRACT_TYPE_VALUES = ("cdi", "cdd", "freelance")
JOB_SOURCE_VALUES = ("manual", "url", "jsearch")
FILE_TYPE_VALUES = ("pdf", "docx")
DOC_TYPE_VALUES = ("cv", "cover_letter")


def upgrade() -> None:
    job_status = sa.Enum(*JOB_STATUS_VALUES, name="jobstatus")
    contract_type = sa.Enum(*CONTRACT_TYPE_VALUES, name="contracttype")
    job_source = sa.Enum(*JOB_SOURCE_VALUES, name="jobsource")
    file_type = sa.Enum(*FILE_TYPE_VALUES, name="filetype")
    doc_type = sa.Enum(*DOC_TYPE_VALUES, name="doctype")

    bind = op.get_bind()
    job_status.create(bind, checkfirst=True)
    contract_type.create(bind, checkfirst=True)
    job_source.create(bind, checkfirst=True)
    file_type.create(bind, checkfirst=True)
    doc_type.create(bind, checkfirst=True)

    op.create_table(
        "job_offers",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False, index=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("company", sa.String(), nullable=False),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("salary", sa.String(), nullable=True),
        sa.Column("contract_type", contract_type, nullable=True),
        sa.Column("recruiter_name", sa.String(), nullable=True),
        sa.Column("status", job_status, nullable=False, server_default="to_apply"),
        sa.Column("applied_at", sa.Date(), nullable=True),
        sa.Column("followup_date", sa.Date(), nullable=True),
        sa.Column("interview_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source", job_source, nullable=False, server_default="manual"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_job_offers_user_id", "job_offers", ["user_id"])

    op.create_table(
        "user_profiles",
        sa.Column("user_id", sa.String(), primary_key=True),
        sa.Column("generation_instructions", sa.Text(), nullable=True),
        sa.Column("preferred_language", sa.String(), server_default="fr"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "templates",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False, index=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("job_type", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("file_type", file_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_templates_user_id", "templates", ["user_id"])

    op.create_table(
        "generated_documents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False, index=True),
        sa.Column("job_offer_id", sa.String(), nullable=True),
        sa.Column("template_id", sa.String(), nullable=True),
        sa.Column("doc_type", doc_type, nullable=False),
        sa.Column("language", sa.String(), nullable=False, server_default="fr"),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("file_path", sa.String(), nullable=True),
        sa.Column("instructions_snapshot", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(
        "ix_generated_documents_user_id", "generated_documents", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_generated_documents_user_id", table_name="generated_documents")
    op.drop_table("generated_documents")
    op.drop_index("ix_templates_user_id", table_name="templates")
    op.drop_table("templates")
    op.drop_table("user_profiles")
    op.drop_index("ix_job_offers_user_id", table_name="job_offers")
    op.drop_table("job_offers")

    bind = op.get_bind()
    for name in ("doctype", "filetype", "jobsource", "contracttype", "jobstatus"):
        sa.Enum(name=name).drop(bind, checkfirst=True)
