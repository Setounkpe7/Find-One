"""initial schema

Revision ID: 9a22ed8c7e07
Revises:
Create Date: 2026-04-13 20:25:21.514039

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


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
    # create_type=False prevents SQLAlchemy from auto-issuing CREATE TYPE when
    # these enums are first referenced inside op.create_table — otherwise the
    # explicit .create() below plus the implicit one collide with
    # DuplicateObject on fresh Postgres databases.
    job_status = postgresql.ENUM(*JOB_STATUS_VALUES, name="jobstatus", create_type=False)
    contract_type = postgresql.ENUM(*CONTRACT_TYPE_VALUES, name="contracttype", create_type=False)
    job_source = postgresql.ENUM(*JOB_SOURCE_VALUES, name="jobsource", create_type=False)
    file_type = postgresql.ENUM(*FILE_TYPE_VALUES, name="filetype", create_type=False)
    doc_type = postgresql.ENUM(*DOC_TYPE_VALUES, name="doctype", create_type=False)

    bind = op.get_bind()
    for enum_type in (job_status, contract_type, job_source, file_type, doc_type):
        enum_type.create(bind, checkfirst=True)

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


def downgrade() -> None:
    op.drop_table("generated_documents")
    op.drop_table("templates")
    op.drop_table("user_profiles")
    op.drop_table("job_offers")

    bind = op.get_bind()
    for name in ("doctype", "filetype", "jobsource", "contracttype", "jobstatus"):
        postgresql.ENUM(name=name).drop(bind, checkfirst=True)
