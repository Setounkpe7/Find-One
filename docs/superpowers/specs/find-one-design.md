# Find-One — Design spec

**Date:** 2026-04-13
**Status:** Approved
**Branch:** dev → main

---

## What we're building

Find-One is a job application tracker. You save offers, log where they stand, and generate tailored CVs and cover letters for each one. The first version is built for a single user, but the data model and auth layer are designed so adding more accounts later doesn't require starting over.

---

## Git workflow

```
local development
 ↓ git commit
pre-commit hook: TruffleHog + pytest + vitest
 → commit rejected if any check fails
 ↓ all checks pass → git push to dev
GitHub Action #1 auto-opens a PR (dev → main)
 ↓ PR opened
GitHub Action #2 runs CI pipeline:
  lint-and-test (blocks on failure) → security scans → reports
 ↓ you review code + security reports
manual merge
 ↓ merge to main
Vercel detects the push and deploys to production automatically
```

There's no deploy stage in the pipeline. Vercel's native GitHub integration handles production deploys when code lands on `main`. The CI pipeline gives you enough information to decide whether to merge — not to gate the deploy itself.

Code must be working before it's committed. The pre-commit hook enforces this locally. The CI pipeline is a second verification pass, not the primary safety net.

---

## Tech stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | React + Vite | Large ecosystem, required by the frontend-design skill |
| Backend | Python FastAPI | Async by default, Pydantic validation baked in, good Python security tooling |
| Database (local) | PostgreSQL via Docker | Same engine as production |
| Database (prod) | Supabase PostgreSQL | Managed, free tier, built-in auth and storage |
| Auth | Supabase Auth | Handles JWTs, sessions, and email/password flows out of the box |
| File storage | Supabase Storage | For templates (PDF/DOCX) and generated documents |
| LLM | Claude API (Anthropic) | Used for CV/cover letter generation and template adaptation |
| Job search | JSearch API (RapidAPI) | Aggregates multiple job boards, free tier available |
| Secrets (local) | HashiCorp Vault + .env | Vault runs in Docker alongside the app |
| Secrets (prod) | Vercel environment variables | Encrypted at rest, injected at runtime |
| Containers | Docker Compose | Orchestrates backend + PostgreSQL + Vault locally |

---

## Repository structure

```
Find-One/
├── frontend/                  # React + Vite
│   ├── src/
│   └── package.json
├── backend/                   # FastAPI
│   ├── app/
│   │   ├── api/               # Route handlers
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic (auth, generation, scraping)
│   │   └── main.py
│   └── requirements.txt
├── docs/
│   └── superpowers/
│       └── specs/
├── .github/
│   └── workflows/
│       ├── auto-create-pr.yml
│       └── ci-pipeline.yml
├── docker-compose.yml
├── .env.example               # Placeholder values only, never real secrets
└── vercel.json                # FastAPI serverless config
```

---

## Environments

**Local (dev)**

Docker Compose starts three containers: the FastAPI backend, a PostgreSQL instance, and HashiCorp Vault. The React frontend runs with `vite dev` on port 5173. All secrets come from Vault or a local `.env` file that is never committed.

**Production**

The React build is a static site on Vercel. FastAPI runs as Vercel serverless Python functions under `/api/*`. The database is Supabase PostgreSQL. Secrets are injected through Vercel's environment variable system.

---

## Features

### Job offer tracking

Each offer stores: job title, company, URL, status, application date, location, salary range, contract type (CDI/CDD/freelance), recruiter name, expected follow-up date, and free-form notes.

Status options: `À postuler` → `Postulé` → `Entretien planifié` → `Refusé` / `Offre reçue` / `Abandonné`

Visual indicators (no email, no cron job needed):
- Orange badge: follow-up date is today or past, status is `Postulé`
- Red badge: interview date is within 48 hours

### Job search

Two ways to add an offer:
1. **Manual entry** — fill in the fields directly
2. **URL import** — paste a job listing URL, the backend scrapes the page and pre-fills the form (title, company, description)
3. **JSearch search** — search by keyword directly in the app, results come from the JSearch API

### CV and cover letter generation

Users upload templates as PDF or DOCX files. Each template is tagged with a job type (e.g., "Backend Developer", "Data Scientist"). Users also write personal instructions that tell the app how they want documents written — tone, what to include, what to skip.

When generating a document for a job offer:
1. Backend finds the best matching template by job type
2. If no exact match exists, Claude picks the closest one and adapts it
3. Claude generates the document using: the template, the user's instructions, and the job offer details
4. The response streams back via Server-Sent Events so the frontend can show it progressively
5. The final document is saved as PDF and DOCX (via Python libraries), stored in Supabase Storage

A snapshot of the instructions is saved with each generated document, so you can always tell what instructions were active when a document was produced.

---

## Data model

```sql
-- Managed by Supabase Auth
users (id, email, created_at)

user_profiles (
  user_id         FK → users.id,
  generation_instructions  text,
  preferred_language       text,
  created_at, updated_at
)

job_offers (
  id, user_id     FK → users.id,
  title, company, url, location, salary,
  contract_type   ENUM(cdi, cdd, freelance),
  recruiter_name, status, applied_at,
  followup_date, interview_date, notes,
  source          ENUM(manual, url, jsearch),
  created_at, updated_at
)

templates (
  id, user_id     FK → users.id,
  name, job_type,
  file_path, file_type  ENUM(pdf, docx),
  created_at
)

generated_documents (
  id, user_id          FK → users.id,
  job_offer_id         FK → job_offers.id,
  template_id          FK → templates.id (nullable),
  doc_type             ENUM(cv, cover_letter),
  language, content    text,
  file_path,
  instructions_snapshot text,
  created_at
)
```

Row Level Security is enabled on all tables. Every query is scoped to the authenticated user at the database level, not just the API level.

---

## Authentication

Supabase Auth handles the full auth lifecycle: registration, login, session management, and JWT refresh. FastAPI validates the JWT on every request via middleware. Supabase stores tokens in HttpOnly cookies, not localStorage.

```
POST /auth/register  → Supabase Auth
POST /auth/login     → Supabase Auth → returns JWT
GET  /api/*          → FastAPI middleware validates JWT
```

---

## Security tools and pipeline

### Tools

| Category | Tool |
|---|---|
| Secrets scanning | TruffleHog |
| SCA — Python | pip-audit |
| SCA — JavaScript | npm audit |
| SAST — Python | Bandit + Semgrep |
| Compliance as code | Checkov (Dockerfile, docker-compose, GitHub Actions YAML) |
| DAST | OWASP ZAP (CLI mode, runs against the local Docker stack) |

### What they scan in this project

- **TruffleHog** — git history and staged files for leaked secrets
- **pip-audit** — Python dependencies in `requirements.txt`
- **npm audit** — JavaScript dependencies in `package.json`
- **Bandit** — Python code for common vulnerabilities (SQL injection, command injection, insecure crypto)
- **Semgrep** — multi-language patterns across the whole codebase
- **Checkov** — `Dockerfile`, `docker-compose.yml`, and `.github/workflows/*.yml` for misconfigurations
- **OWASP ZAP** — HTTP attack simulation against the running app (Docker Compose up → scan → Docker Compose down)

### Reports

Every scan produces a timestamped JSON file (`tool_YYYY-MM-DD_HH-MM-SS.json`). After all scans run, a Python script consolidates them into a single PDF report (`security-report_YYYY-MM-DD_HH-MM-SS.pdf`) using WeasyPrint. If WeasyPrint fails, the individual JSON files and an HTML summary are uploaded as GitHub Actions artifacts. Artifacts are retained for 30 days.

Scans do not block the pipeline. They produce reports. You decide whether to merge.

### What blocks vs. what reports

| Stage | Behavior on failure |
|---|---|
| `lint-and-test` | **Blocks the pipeline** — subsequent jobs do not run |
| `security-scans` | Does not block — generates reports regardless |
| `generate-reports` | Does not block — uploads available artifacts even if PDF generation fails |

Tests must pass before anything else runs. Security findings are reported for your review, not used as a gate.

---

## CI/CD pipeline

### Pre-commit hooks (local)

Before any commit reaches `dev`, a pre-commit hook runs automatically on the developer's machine:

```
git commit triggered
       ↓
pre-commit hook
  ├── TruffleHog  — scans staged files for secrets and credentials
  ├── pytest      — full backend unit test suite
  └── vitest      — full frontend unit test suite
       ↓
if any check fails → commit is rejected, nothing is pushed
if all pass        → commit proceeds
```

This keeps secrets and broken code out of the git history entirely. By the time a push reaches `dev`, the code is already tested and clean. The CI pipeline on the PR is a second line of defense, not the first.

The hooks are defined in `.pre-commit-config.yaml` and installed with `pre-commit install`. Every developer working on the repo runs `pre-commit install` once after cloning.

---

### GitHub Action #1 — `auto-create-pr.yml`

Triggers on every push to `dev`. Checks whether a PR from `dev` to `main` is already open. If not, creates one using `gh pr create` with a structured description generated from the commit list. If one exists, updates the description.

### GitHub Action #2 — `ci-pipeline.yml`

Triggers on pull requests targeting `main`.

```
lint-and-test
  ├── backend: pytest + flake8 + mypy
  └── frontend: vitest + eslint
       ↓
security-scans (parallel steps)
  ├── TruffleHog
  ├── pip-audit
  ├── npm audit
  ├── Bandit
  ├── Semgrep
  ├── Checkov
  └── OWASP ZAP (starts Docker Compose, scans, stops)
       ↓
generate-reports
  ├── consolidate JSON results
  ├── generate PDF via WeasyPrint (security-report_YYYY-MM-DD_HH-MM-SS.pdf)
  └── upload PDF + JSON as GitHub Actions artifacts (fallback if PDF fails)
```

No deploy stage. After reviewing the pipeline results and the code, you merge the PR manually. Vercel deploys from `main` automatically.

---

## Document generation — file handling

The frontend handles PDF and DOCX as plain file uploads and downloads over HTTP. All processing happens in the backend using Python libraries:

| Operation | Library |
|---|---|
| Read PDF templates | pdfplumber or PyMuPDF |
| Read DOCX templates | python-docx |
| Generate PDF output | WeasyPrint or ReportLab |
| Generate DOCX output | python-docx |

Generated files are stored in Supabase Storage and served to the frontend via signed URLs.

The `pdf` and `docx` skills from `~/.agents/skills` are Claude Code tools — they help during development when I need to read or analyze template files, not libraries used in the running application.

---

## Backend code standards

- All inputs validated with Pydantic schemas before touching the database
- SQL queries go through SQLAlchemy ORM — no raw queries
- CORS restricted to `localhost:5173` (dev) and the Vercel production domain
- Rate limiting on auth endpoints via `slowapi`
- No secrets in code — all loaded from environment variables at startup

---

## Skills used throughout the project

| Skill | When it's used |
|---|---|
| `frontend-design` | All frontend code |
| `simplify` | Code review after every implementation step |
| `humanizer` | All documentation, including this file |

