# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ NON-NEGOTIABLE WORKFLOW RULES

**These rules run BEFORE you respond with text, BEFORE you claim a task is done, and BEFORE you hand control back to the user. Ignoring any of them is a failure — not a style choice.**

Run this checklist EVERY turn where you touched code or docs. If a box can't be ticked, you are not done.

### 1. Complex task → plan with `superpowers` FIRST
**Trigger:** the task is non-trivial. Concrete signals that it is non-trivial:
- Touches more than 2 files, OR
- Requires sequencing multiple steps that depend on each other, OR
- Introduces a new feature, refactor, migration, or system component, OR
- You would naturally create 3+ TodoWrite items for it.

**Action:** BEFORE writing any implementation code:
1. If requirements or design intent are unclear → invoke `superpowers:brainstorming` first to lock the scope.
2. Once the scope is clear → invoke `superpowers:writing-plans` to produce the full step-by-step plan (saved under `docs/superpowers/plans/YYYY-MM-DD-<name>.md`).
3. Only then execute — via `superpowers:subagent-driven-development` (same session) or `superpowers:executing-plans` (separate session).

**Do NOT** start typing code for a complex task and "plan as you go". The plan is the contract — it prevents scope drift, missed requirements, and the kind of rework that wastes hours.

**Exception:** trivial tasks (one-line fix, rename, typo, single-file tweak, answering a question) — skip the plan, just do it.

### 2. Frontend work → `/frontend-design` skill
**Trigger:** any Write or Edit that touches files under `frontend/`, `.html`, `.css`, `.tsx`, `.jsx`, or any UI mockup (including `design-proposals/`).
**Action:** invoke the `frontend-design` skill BEFORE producing the final output. Not after. Not "if it feels relevant". Always.

### 3. After ANY code Write/Edit → `/simplify` skill
**Trigger:** you used the `Write`, `Edit` tool on source code, CSS, HTML, or any file meant to ship.
**Action:** before telling the user "done", invoke `/simplify`. It will dispatch review agents and fix findings. The task is NOT complete until simplify has run and its fixes are applied.
**The most common failure mode is skipping this step because the code "looks clean". Run it anyway.**

### 4. PDF or DOCX files → `pdf` / `docx` skills
**Trigger:** any file ending in `.pdf` or `.docx`, or a task that involves reading/generating those formats.
**Action:** use the corresponding `pdf` or `docx` skill instead of raw Read or shell tools.

### 5. Any browser / web task → `browser-use` CLI
**Trigger:** you need to interact with a web page programmatically — opening a URL, clicking, typing, filling forms, reading the DOM, extracting `localStorage` / cookies / headers, verifying a frontend-to-backend call end-to-end, reproducing a user-reported UI state.
**Action:** use `uvx browser-use` (see the "Browser diagnostics" section below for command forms). Do NOT use raw `curl`, `wget`, or ask the user to copy/paste DevTools output when an assertion about the running app is what you need.
**Applies whether** the task is troubleshooting, end-to-end verification of a code change, or any other "open this page and check X" work. Visual layout review by the *user* in their own browser is still their call — this rule is about what the tool *I* use to touch a browser.

### 6. Writing user-facing documentation → `/humanizer` skill
**Trigger:** you wrote or edited a `.md` file whose **audience is a human reader** — README, marketing copy, blog posts, help text, user guides.
**Action:** run `/humanizer` on the resulting text before declaring the doc done.

**Do NOT run humanizer on:**
- Implementation plans under `docs/superpowers/plans/` (executed by agents following a checklist; humanizer flattens the structure).
- Specs, technical designs, architecture docs, ADRs.
- Runbooks and incident playbooks (precision matters; humanizer softens imperatives).
- Config/changelog/CI documentation.
- CLAUDE.md itself (rules need imperative voice).

For these technical doc types, the quality gate is clarity + completeness checked by you, not by humanizer. If unsure whether a `.md` file is user-facing, ask the user.

### 7. End-of-turn checklist (paste yourself through this mentally before replying)

```
[ ] Is the task non-trivial?        → a plan was produced via superpowers BEFORE code was written
[ ] Did I touch code?               → /simplify was invoked and findings applied
[ ] Did I touch the frontend?        → /frontend-design was invoked
[ ] Did I touch a .md file?         → /humanizer was invoked (unless exempt per rule 6)
[ ] Did I handle a PDF/DOCX?        → used the pdf/docx skill
[ ] Did I need to touch a browser?  → used browser-use, not curl or DevTools-by-proxy
[ ] Did I verify my claims?         → ran tests/lint/the actual command before saying "done"
```

If ANY box is unchecked and its trigger fired, STOP, run the missing skill, THEN reply.

**Why this matters:** rules written as "Always use X" are too soft — they read like suggestions. These rules are gates: the turn is incomplete until each triggered gate has passed. Treat skipping one the same way you'd treat shipping code without running tests.

---

## What This Project Is

Find-One is a job application tracker. Users save job offers, track application status, and generate tailored CVs and cover letters via the Claude API. The backend is a FastAPI + PostgreSQL service; the frontend is React + Vite. Authentication is handled entirely by Supabase Auth (JWT tokens).

---

## Commands

### One-shot dev startup

```bash
scripts/dev.sh                 # backend + frontend + opens the browser
scripts/dev.sh --no-browser    # skip the browser step
```

Runs uvicorn and Vite in parallel, waits for both to listen, then opens http://localhost:5173. Ctrl+C stops everything. Requires `uvicorn` on PATH (activate your Python env first) and `cd frontend && npm install` done once.

### Backend

```bash
# Run all backend tests
cd backend && python -m pytest tests/ -x -q --tb=short

# Run a single test
cd backend && python -m pytest tests/test_jobs.py::test_create_job_offer -v

# Lint (CI requires max-line-length=100)
python -m flake8 backend/app/ --max-line-length=100

# Type check
mypy backend/app/ --ignore-missing-imports

# Start dev server
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
# Run all frontend tests
cd frontend && npm run test:run

# Run a single test file
cd frontend && npx vitest run src/tests/MyComponent.test.tsx

# Lint (zero warnings allowed)
cd frontend && npm run lint

# Dev server
cd frontend && npm run dev

# Production build
cd frontend && npm run build
```

### Database

```bash
# Start local PostgreSQL + Vault via Docker Compose
docker-compose up -d

# Apply migrations (run from repo root)
cd backend && alembic upgrade head
```

### Pre-commit Hooks

Pre-commit hooks run automatically on `git commit` and must pass:
1. TruffleHog — secret scanning
2. pytest — backend unit tests
3. vitest — frontend unit tests

Install hooks: `pre-commit install`

### Browser tasks with `browser-use`

`browser-use` is the **default tool** for any programmatic browser interaction (see rule 5 in the non-negotiable section). It runs Chromium via Playwright.

**Core commands:**

```bash
uvx browser-use doctor                                          # verify setup (first time)

# Session-based flow — keep flags BEFORE the subcommand
uvx browser-use --headed --session <name> open <url>            # open a URL in a named session
uvx browser-use --session <name> state                          # dump current DOM
uvx browser-use --session <name> click <selector>               # click an element
uvx browser-use --session <name> type <selector> "<text>"       # type into a field
uvx browser-use --session <name> screenshot                     # capture a PNG
uvx browser-use --session <name> eval '<js expression>'         # run JS in page context
uvx browser-use --session <name> extract '<instruction>'        # AI-assisted extraction
uvx browser-use --session <name> cookies                        # dump cookies
uvx browser-use --session <name> close                          # end the session
```

**Use a named session** (`--session <name>`) so multiple calls share state (login, cookies, `localStorage`). Without `--session`, each call starts fresh.

**Headed vs headless:** use `--headed` when the user needs to perform a manual step (e.g. typing a password). Drop it once the session is established — later calls reuse the same session even without the flag.

**`eval` doesn't await promises.** Stash async results on `window` and read them back:

```bash
uvx browser-use --session findone eval 'window.__r=null; fetch(URL, OPTS).then(r => r.text().then(b => window.__r={status:r.status, body:b})); "ok"'
sleep 3
uvx browser-use --session findone eval 'JSON.stringify(window.__r)'
```

**Inspecting Supabase auth state (common):**

```bash
uvx browser-use --session findone eval 'JSON.stringify(Object.keys(localStorage).filter(k => k.startsWith("sb-")))'
uvx browser-use --session findone eval 'JSON.parse(localStorage.getItem("sb-<project>-auth-token")).access_token'
# decode the JWT locally (header + payload base64) to verify alg/kid/iss/exp
```

**Typical use cases** (all covered by rule 5):
- End-to-end verification after a frontend change — open the app, exercise the feature, assert the DOM/network state instead of trusting "it compiled".
- Troubleshooting auth, CORS, CSP, missing headers — reading what the browser actually sends beats what you *think* it sends.
- Reproducing a user-reported UI state on your own machine without their credentials (ask them to log in inside the `browser-use` window once, then inspect).
- Scraping public pages where raw `curl` would miss JS-rendered content.

---

## Architecture

### Backend (`backend/app/`)

- **`main.py`** — FastAPI app creation, CORS, rate limiter (slowapi), router registration.
- **`config.py`** — Settings loaded from environment via pydantic-settings. All secrets come from env vars.
- **`database.py`** — SQLAlchemy engine + `get_db` dependency. Uses `DATABASE_URL` from config.
- **`deps.py`** — `get_current_user()` FastAPI dependency: validates Supabase JWT and returns `{"user_id": ..., "email": ...}`.
- **`api/`** — One router per resource: `auth`, `jobs`, `profile`, `search`, `templates`, `documents`.
- **`models/`** — SQLAlchemy ORM models: `JobOffer`, `UserProfile`, `Template`, `GeneratedDocument`.
- **`schemas/`** — Pydantic request/response models.
- **`services/`** — Business logic: `doc_generator.py` (streaming Claude API), `template_parser.py` (PDF/DOCX), `jsearch.py` (RapidAPI), `scraper.py` (BeautifulSoup), `storage.py` (Supabase Storage), `auth.py` (JWT decode).
- **`alembic/`** — Migrations. Run from `backend/` directory. Single initial migration creates all tables.

### Frontend (`frontend/src/`)

- **Routing** — React Router v6. Protected routes redirect to `/login` if unauthenticated.
- **Auth state** — Zustand store at `stores/authStore.ts`. Supabase client handles token refresh.
- **Pages** — `Login`, `Register`, `Dashboard`, `JobDetail`, `JobSearch`, `Templates`, `Profile`.
- **API calls** — Direct `fetch` calls to the FastAPI backend (`VITE_API_URL`).

### Test Strategy

Backend tests use SQLite in-memory (not PostgreSQL). Each test function gets a fresh schema and a `TestClient` with `get_db` and `get_current_user` overridden. No Supabase or Anthropic calls are made in tests.

Frontend tests use Vitest with jsdom. `src/tests/setup.ts` configures `@testing-library/jest-dom`.

### CI/CD

- Push to `dev` → `auto-create-pr.yml` opens or updates a PR to `main`.
- PR to `main` → `ci-pipeline.yml` runs:
  - **Lint & Test** (must pass): pytest, flake8, mypy, vitest, eslint
  - **Security Scans** (informational): TruffleHog, pip-audit, npm audit, Bandit, Semgrep, Checkov, OWASP ZAP — results uploaded as 30-day artifacts.
- Merging to `main` triggers Vercel auto-deploy.

### Workflow rules
See the **NON-NEGOTIABLE WORKFLOW RULES** block at the top of this file. The skills listed there (`frontend-design`, `simplify`, `humanizer`, `pdf`, `docx`) are gates, not suggestions.

### Self-Improvements
- When you make a mistake, log it in ~/.claude/memory/ and learn from it. Evolve continuously.
- Ruthlessly iterate on the lessons learned until mistake rate drops
- Review lessons in ~/.claude/memory/ at session start
