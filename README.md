# Find-One

Find-One is a job application tracker. You save job postings, keep track of where you are on each one, and generate tailored CVs and cover letters through Anthropic's Claude API.

The product is the occasion. The actual point of this repo is how the app is built, tested and shipped: a DevSecOps pipeline that covers the full cycle, from local commit all the way to production on Vercel.

---

## What the app does

- Save job postings: manual entry, search via JSearch, or scrape from a URL.
- Track application status (to apply, applied, interview, rejected, accepted).
- Store a user profile (background, skills, experience) in Supabase.
- Import CV and cover letter templates as PDF or DOCX.
- Generate a custom document per posting, streamed, through the Claude API.
- All of it behind Supabase authentication (JWT validated server-side).

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Zustand, React Router 6 |
| Backend | FastAPI (Python 3.13), SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16 |
| Auth | Supabase Auth (JWT validated server-side) |
| File storage | Supabase Storage |
| AI | Anthropic API (Claude models) |
| Job search | JSearch (RapidAPI) |
| Hosting | Vercel (frontend + Python functions) |
| CI/CD | GitHub Actions |

---

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  React/Vite │─────▶│   FastAPI        │─────▶│   PostgreSQL    │
│  (Vercel)   │      │  (Vercel Fn)     │      │  (managed)      │
└─────────────┘      └──────────────────┘      └─────────────────┘
       │                       │
       │                       ├──▶ Supabase Auth (JWT)
       │                       ├──▶ Supabase Storage
       │                       ├──▶ Claude API (Anthropic)
       │                       └──▶ JSearch (RapidAPI)
       │
       └── Supabase JS auth (token refreshed client-side)
```

The backend validates the Supabase JWT on every request via the FastAPI dependency `get_current_user`. No authenticated endpoint runs without a valid token.

---

## DevSecOps pipeline

Security runs at three points: on the dev machine before the commit, in CI on every PR, and at deploy time.

### Overview

```
        ┌────────────────┐
        │   Dev machine  │
        │  (pre-commit)  │
        └────────┬───────┘
                 │ push to the dev branch
                 ▼
        ┌────────────────┐
        │   Auto-PR to   │   workflow auto-create-pr.yml
        │      main      │
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────────────────────┐
        │  CI Lint & Test (blocking)     │   workflow ci-pipeline.yml
        └────────┬───────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────┐
        │  CI Security scans             │   SAST + SCA + DAST + IaC + SBOM
        └────────┬───────────────────────┘
                 │ merge to main
                 ▼
        ┌────────────────┐
        │ Vercel deploy  │
        │  (production)  │
        └────────────────┘
```

### Step 1, on the developer machine

Configured in [`.pre-commit-config.yaml`](.pre-commit-config.yaml). Three hooks block the commit if any of them fails:

| Hook | Tool | Purpose |
|---|---|---|
| `trufflehog` | TruffleHog | Blocks any verified secret (API key, token) found in git history. |
| `pytest` | pytest | Runs backend unit tests against in-memory SQLite. |
| `vitest` | Vitest | Runs frontend unit tests. |

The goal is that a committed secret never leaves the machine and a unit regression never reaches `dev`.

Local install: `pre-commit install`.

### Step 2, CI lint and tests

Triggered on every PR to `main` ([`ci-pipeline.yml`](.github/workflows/ci-pipeline.yml), job `lint-and-test`).

- A PostgreSQL 16 service is started inside the job.
- Backend: pytest against PostgreSQL, flake8, mypy.
- Frontend: vitest, eslint with `--max-warnings 0` (a single warning breaks the build).

As long as this job fails, the security job does not run and the PR cannot be merged.

### Step 3, security scans

Second job of the same workflow (`security-scans`), it depends on the previous one. It covers five families of scans:

| Family | Tool | Target | Behavior |
|---|---|---|---|
| Secrets | TruffleHog | Full git history | Blocks on verified secrets. |
| Python SCA | pip-audit | `backend/requirements.txt` | Blocks as soon as a vulnerability is found. |
| JS SCA | npm audit | `frontend/package-lock.json` | Blocks on `critical` vulnerabilities. |
| Python SAST | Bandit | `backend/app/` | Blocks on `HIGH severity + MEDIUM confidence` findings. |
| Multi-language SAST | Semgrep | `backend/`, `frontend/src/` | Report-only, archived as an artifact. |
| IaC | Checkov | Whole repo | Report-only, archived as an artifact. |
| DAST | OWASP ZAP | FastAPI API booted during the job | Authenticated scan via the OpenAPI spec. |
| SBOM | Anchore syft (`sbom-action`) | Whole repo | SPDX SBOM archived for 30 days. |

A few notes on how it works.

The ZAP scan runs authenticated. The workflow boots a real uvicorn instance, applies the Alembic migrations against PostgreSQL, then runs `zap-api-scan.py` with the OpenAPI spec as input. A Python hook ([`zap_auth_hook.py`](.github/workflows/zap_auth_hook.py)) injects a Supabase service-role JWT through ZAP's replacer API, which lets ZAP reach every protected route. A standard baseline scan would get stuck on `/health` and two redirects, which is worthless against an authenticated API.

The blocking thresholds are deliberate. TruffleHog, pip-audit, npm-audit at `critical` and Bandit at `high` break the PR. Semgrep, Checkov and ZAP feed artifacts without blocking. The false positive rate of those three doesn't justify stopping a delivery, but their reports stay available for 30 days for cold review.

The reports are timestamped and archived. Each run produces a `security-reports/<timestamp>/` folder uploaded as a GitHub artifact. This history makes it possible to compare the posture from one PR to the next, and to react quickly when a CVE drops on a dependency (by cross-referencing the SPDX SBOM produced on the same run).

### Step 4, deploy

A merge to `main` triggers Vercel automatically:
- The Vite frontend is served statically.
- The FastAPI backend runs as a Python function. Vercel strips the `/server` prefix before hitting the app. See [`vercel.json`](vercel.json).

Production secrets (Supabase, Anthropic, JSearch) are managed through Vercel environment variables.

### Helper workflow

[`auto-create-pr.yml`](.github/workflows/auto-create-pr.yml) opens or updates a `dev` → `main` PR on every push to `dev`, with a commit summary in the body. It removes the human step of opening the PR by hand and makes sure the CI runs early.

### Tool recap

| Category | Tool | Stage |
|---|---|---|
| Secret scanning | TruffleHog | pre-commit + CI |
| Unit tests | pytest, Vitest | pre-commit + CI |
| Linting | flake8, mypy, eslint | CI |
| Python SCA | pip-audit | CI |
| JS SCA | npm audit | CI |
| Python SAST | Bandit | CI |
| Multi-language SAST | Semgrep | CI |
| IaC | Checkov | CI |
| DAST | OWASP ZAP (API mode + auth) | CI |
| SBOM | Anchore syft | CI |
| Hosting | Vercel | post-merge |

---

## Local setup

### Prerequisites

Python 3.13, Node 20, Docker, `pre-commit`. A Supabase project (auth + storage) and an Anthropic API key.

### Getting it running

```bash
# 1. Clone and copy the env file
cp .env.example .env
# Fill in the Supabase, Anthropic and JSearch keys

# 2. Backend
cd backend
pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head
cd ..

# 3. Frontend
cd frontend
npm install
cd ..

# 4. Install the pre-commit hooks
pre-commit install

# 5. Boot everything
scripts/dev.sh
```

`scripts/dev.sh` starts uvicorn and Vite in parallel, waits for both to come up, and opens the app in the browser. `Ctrl+C` stops both.

A `docker-compose.yml` is provided if you'd rather containerize everything (PostgreSQL + Vault + backend).

---

## Tests

```bash
# Backend (in-memory SQLite, no Supabase, no Claude API)
cd backend && pytest

# Frontend
cd frontend && npm run test:run
```

The backend tests override `get_db` and `get_current_user` through FastAPI dependencies. No network call leaves the suite while tests are running.

---

## Repo layout

```
.
├── .github/workflows/        # CI/CD workflows (auto-PR + pipeline)
├── .pre-commit-config.yaml   # Blocking local hooks
├── api/                      # Vercel function entrypoint (FastAPI)
├── backend/
│   ├── app/                  # FastAPI app (routers, services, models)
│   ├── alembic/              # DB migrations
│   └── tests/                # pytest tests
├── frontend/
│   └── src/                  # React + Vite (pages, components, stores)
├── scripts/                  # dev.sh, local security scans
├── security-reports/         # CI scan archives
├── docs/                     # Runbook and design notes
├── docker-compose.yml        # Local stack (Postgres + Vault + backend)
└── vercel.json               # Deploy config
```

---

## What this project shows

A full-stack app going through a realistic delivery cycle: local commits gated by pre-commit, CI with lint, tests and eight security tools running on the same PR, deploy handled by Vercel on merge. The DAST is wired to authenticate, so it scans more than the login page. The blocking thresholds are set explicitly, not left to "whatever the tool returns by default".

Everything is reproducible locally through `scripts/dev.sh` and `pre-commit install`.
