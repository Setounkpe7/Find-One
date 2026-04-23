# Vercel Services Migration — Fix Python 3.14 Forcing in Prod

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Find-One from a single-build `vercel.json` (buildCommand + rewrites) to Vercel **Services** (`experimentalServices`), so the Python builder respects `Pipfile` / `requires-python = 3.12` instead of forcing CPython 3.14.3.

**Architecture:** Declare two services in `vercel.json` — a Vite `web` service at `/` and a Python `api` service at `/server` (strip-based routing per Vercel). Because Vercel strips `routePrefix` before invoking the service, FastAPI router prefixes (`/api/*`, `/auth/*`) stay as-is. Frontend code is unchanged; we only set `VITE_API_URL=/server` in Vercel project env. Backend `backend/**` ships with the Python service via `includeFiles`.

**Tech Stack:** Vercel Services (`experimentalServices`, beta), FastAPI on Python 3.12, Vite/React frontend, `api/index.py` as ASGI entrypoint.

---

## Context & Decisions

### Why Services (the root cause)

`gscho` (Vercel python/backend team) confirmed in https://community.vercel.com/t/python-version-pyproject-toml-and-pipfile-lock-all-ignored-builder-forces-cpython-3-14-3/38795/4 that when a project mixes a frontend and a Python backend inside a single Vercel project, the builder's version-detection heuristics break — pins in `Pipfile`, `.python-version`, and `pyproject.toml` are ignored, and CPython 3.14.3 is forced. The supported fix is to declare each as a **Service**. Services build each entrypoint with its own framework (Vite for `frontend/`, FastAPI for `api/index.py`), and the Python builder then honors `Pipfile`'s `python_version = 3.12`.

### Why `routePrefix` paths don't break FastAPI code

Per https://vercel.com/docs/services/routing and the canonical `vercel/examples/python/nextjs-flask` template: Vercel **strips the `routePrefix`** before invoking the backend service. The Flask example has `routePrefix: "/api/python"` in `vercel.json` and `@app.route("/")` in code — browser requests to `/api/python` reach Flask as `/`. Therefore, with `routePrefix: "/server"`:

- Browser request to `/server/api/jobs`
- Vercel strips `/server` and invokes `api/index.py` with path `/api/jobs`
- Existing FastAPI router `prefix="/api/jobs"` matches — no backend changes needed

### Frontend delta

`frontend/src/lib/api.ts` already does `${VITE_API_URL}${path}` with paths like `/api/jobs`. Setting `VITE_API_URL=/server` in Vercel env means prod requests become `/server/api/jobs` — exactly what Services expects. Local dev keeps `VITE_API_URL=http://localhost:8000` (unchanged) → `http://localhost:8000/api/jobs` → FastAPI direct.

There is **one** hardcoded `/api/documents/generate` fetch in `frontend/src/components/DocViewer.tsx:60` that also uses `${import.meta.env.VITE_API_URL}` as its base, so it follows the same rule. No source edits required.

### Backend CORS

`backend/app/main.py:21` sets `allow_origins=[settings.frontend_url]`. After Services, frontend and API share a same-origin domain in prod (both at `*.vercel.app`), so CORS preflights are no longer triggered for prod. But CORS is still needed for local dev (`localhost:5173` → `localhost:8000`). Leave the middleware in place.

### Manual Vercel UI steps (not in repo)

Two actions happen in the Vercel dashboard, not git:

1. **Framework Preset** → change from `Vite` (or whatever) to **Services**. Required per docs: "your project framework setting must be set to Services".
2. **Environment Variables** → add `VITE_API_URL=/server` to **Production** and **Preview** scopes. Do **not** set it for Development (local dev uses the fallback `http://localhost:8000` in `api.ts`).

### Rollback

If the preview deployment fails or prod breaks, revert the single commit that changes `vercel.json`. The workflow in `.github/workflows/auto-create-pr.yml` will rebuild a working deployment from the restored config. Keep this plan file in git as the audit trail; no backup copy of the old `vercel.json` needed (git has it).

### Tradeoff acknowledged

`experimentalServices` is in **Beta** per the docs (last updated 2026-03-11). Field names and behavior may change. This is accepted because:
- It is the official recommendation from the Vercel python team for this use case.
- No stable alternative exists today for polyglot (JS + Python) single-project deployments that respect the Python version pin.
- Rollback is a one-commit revert.

---

## File Structure

**Modify:**
- `vercel.json` — replace the whole file with the Services config.
- `.env.example` — document the new `VITE_API_URL=/server` prod value.
- `README.md` — update the "Deployment" section (if present) with a one-paragraph note on Services.

**Do NOT modify (verify only):**
- `api/index.py` — unchanged; `from app.main import app` still resolves because `includeFiles` ships `backend/**`.
- `backend/app/main.py` and all `backend/app/api/*.py` routers — unchanged.
- `frontend/src/lib/api.ts`, `frontend/src/components/DocViewer.tsx` — unchanged.
- `Pipfile`, `Pipfile.lock`, `requirements.txt` — unchanged; the Python builder will now honor them.

**Outside the repo (Vercel dashboard):**
- Project Settings → Framework Preset → **Services**.
- Project Settings → Environment Variables → add `VITE_API_URL = /server` on Production and Preview.

---

## Task 1: Replace `vercel.json` with Services config

**Files:**
- Modify: `vercel.json` (complete rewrite)

- [ ] **Step 1: Inspect the current `vercel.json` to confirm what's being removed**

Run: `cat vercel.json`
Expected: Shows the current `buildCommand` + `rewrites` config (the one that is currently being ignored by the Python builder).

- [ ] **Step 2: Overwrite `vercel.json` with the Services config**

Replace the entire contents of `vercel.json` with exactly:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "experimentalServices": {
    "web": {
      "entrypoint": "frontend",
      "framework": "vite",
      "routePrefix": "/"
    },
    "api": {
      "entrypoint": "api/index.py",
      "framework": "fastapi",
      "routePrefix": "/server",
      "includeFiles": "backend/**"
    }
  }
}
```

Field-by-field justification:
- `web.entrypoint: "frontend"` — the Vite project directory. Vercel will run `npm install` + `npm run build` using `frontend/package.json`.
- `web.framework: "vite"` — pins framework detection (avoids auto-detection drift on future builds).
- `web.routePrefix: "/"` — catch-all; receives every request that doesn't match a more specific prefix.
- `api.entrypoint: "api/index.py"` — the FastAPI ASGI entrypoint that imports `backend/app/main.py`.
- `api.framework: "fastapi"` — pins the Python/FastAPI builder.
- `api.routePrefix: "/server"` — user-confirmed prefix; Vercel strips it before invoking `api/index.py`.
- `api.includeFiles: "backend/**"` — ensures the `backend/` package is bundled with the Python service so `from app.main import app` resolves at runtime.

- [ ] **Step 3: Verify the file parses as valid JSON**

Run: `python3 -c "import json; json.load(open('vercel.json'))"`
Expected: No output, exit code 0. Any parse error must be fixed before proceeding.

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "feat(vercel): migrate to Services (experimentalServices) to fix Python 3.12 pin"
```

---

## Task 2: Update `.env.example` with the new prod URL convention

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Read the current `.env.example`**

Run: `cat .env.example`
Expected: See the current env vars, including any existing `VITE_API_URL` line.

- [ ] **Step 2: Update the `VITE_API_URL` block**

Find the existing `VITE_API_URL` line (or add one if absent) and replace its block with exactly:

```
# Frontend → backend base URL.
# - Local dev: VITE_API_URL=http://localhost:8000 (points at uvicorn)
# - Vercel Preview + Production: set VITE_API_URL=/server in the Vercel dashboard.
#   Vercel Services strips the /server prefix before hitting the FastAPI function.
VITE_API_URL=http://localhost:8000
```

If no `VITE_API_URL` block existed, append the block at the end of the file.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs(env): document VITE_API_URL=/server for Vercel Services prod"
```

---

## Task 3: Update the deployment note in `README.md` (only if a deployment section exists)

**Files:**
- Modify: `README.md` (conditional — skip this task if README has no deployment section)

- [ ] **Step 1: Check whether `README.md` has a deployment-related section**

Run: `grep -n -iE "deploy|vercel|production" README.md || echo "NO MATCH"`
Expected: Either a list of matching lines, or `NO MATCH`.

- [ ] **Step 2: If matches exist, update the section**

If matches exist, open `README.md` and find the deployment section. Replace whatever vercel/rewrites description is there with exactly:

```markdown
## Deployment

Find-One deploys to Vercel as two Services (see `vercel.json`):

- `web` (Vite/React) mounted at `/`
- `api` (FastAPI) mounted at `/server` — Vercel strips the `/server` prefix before invoking the function, so FastAPI routers keep their existing `/api/*` and `/auth/*` prefixes

On Vercel, the Project Framework Preset must be set to **Services** and the
environment variable `VITE_API_URL=/server` must be set on **Production** and
**Preview** scopes (local dev keeps `http://localhost:8000`).
```

If Step 1 returned `NO MATCH`, **skip this task entirely** and proceed to Task 4 — do not invent a new section.

- [ ] **Step 3: Run humanizer on the edited README**

Per `CLAUDE.md` rule 7, `README.md` is user-facing documentation.
Run the `humanizer` skill on the new Deployment section and apply any suggestions.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): document Vercel Services deployment layout"
```

Skip this commit if Task 3 was skipped.

---

## Task 4: Push the branch and let the auto-PR workflow open/update the PR

**Files:** none (git/CI)

- [ ] **Step 1: Confirm the current branch is `dev`**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `dev`. If not, stop and consult the user — the auto-PR workflow keyed off `dev` in `.github/workflows/auto-create-pr.yml`.

- [ ] **Step 2: Push `dev`**

Run: `git push origin dev`
Expected: Push succeeds. Triggers `auto-create-pr.yml`, which opens (or updates) a PR `dev → main`.

- [ ] **Step 3: Locate the PR**

Run: `gh pr list --head dev --state open`
Expected: One open PR is listed. Record its number as `$PR`.

- [ ] **Step 4: Wait for the PR's preview deployment URL to appear**

Run: `gh pr view $PR --json comments --jq '.comments[-1].body'`
Expected: The latest comment (posted by Vercel's bot) contains a `*.vercel.app` preview URL. Record it as `$PREVIEW_URL`. If no preview URL comment exists yet, re-run after 60 s.

---

## Task 5: Configure the Vercel project for Services (manual dashboard actions)

**Files:** none (Vercel UI)

These actions are done by the user (or anyone with Project Admin access) in the Vercel dashboard. Claude cannot perform them via CLI per the project's memory rule (`feedback_vercel_deploy_flow.md` — no `vercel deploy`). The plan captures the exact clicks so nothing is missed.

- [ ] **Step 1: Set Framework Preset to Services**

Navigate to Vercel dashboard → project `find-one` → Settings → General → Framework Preset.
Change value to: **Services**.
Save.

- [ ] **Step 2: Add `VITE_API_URL=/server` to Production**

Navigate to Settings → Environment Variables → Add new.
- Key: `VITE_API_URL`
- Value: `/server`
- Environments: check **Production** only.
Save.

- [ ] **Step 3: Add `VITE_API_URL=/server` to Preview**

Add another entry:
- Key: `VITE_API_URL`
- Value: `/server`
- Environments: check **Preview** only.
Save.

(Two separate entries rather than one with both boxes, so each scope can be overridden independently later if needed.)

- [ ] **Step 4: Trigger a new preview build to pick up the env var change**

Either:
- In Vercel UI → Deployments → pick the latest PR preview → **Redeploy**, or
- Locally: `git commit --allow-empty -m "chore: trigger redeploy after env var change" && git push origin dev`

- [ ] **Step 5: Capture the new `$PREVIEW_URL`**

Repeat Task 4 Step 4 to grab the updated preview URL.

---

## Task 6: Verify the preview deployment

**Files:** none (verification)

This task is the acceptance gate for the migration. Do NOT merge to `main` until every check below passes.

- [ ] **Step 1: Confirm Python 3.12 in the build logs (the original bug)**

Run: `gh run list --branch dev --limit 1 --json databaseId --jq '.[0].databaseId'` to get the latest CI run id, then for the Vercel build logs either open the Vercel dashboard → Deployments → the active preview → **Build Logs**, or run `vercel inspect $PREVIEW_URL --logs`.

Search the logs for `Using CPython`.
Expected: `Using CPython 3.12.x` (where x is whatever patch version Vercel ships for 3.12).
If you still see `Using CPython 3.14.3`, the Services config did not take effect — recheck Task 5 Step 1 (Framework Preset = Services) before going further.

- [ ] **Step 2: Confirm the web service is reachable**

Run: `curl -sS -o /dev/null -w "%{http_code}\n" $PREVIEW_URL/`
Expected: `200`.

- [ ] **Step 3: Confirm the api service is reachable at `/server`**

The backend exposes a health route. Confirm its path:

Run: `grep -rn "@app.get\|/health" backend/app/main.py | head -5`

If `/health` is defined at the app root: run `curl -sS $PREVIEW_URL/server/health`. Expected: a 200 response with the health JSON.
If no `/health` exists, skip to Step 4 — an authenticated endpoint is the next-best probe.

- [ ] **Step 4: Exercise the UI end-to-end with browser-use (per CLAUDE.md rule 5)**

Run the following, substituting `$PREVIEW_URL`:

```bash
uvx browser-use --headed --session findone-prod-verify open "$PREVIEW_URL"
# user logs in manually in the opened window (Supabase)
uvx browser-use --session findone-prod-verify eval 'JSON.stringify(Object.keys(localStorage).filter(k => k.startsWith("sb-")))'
# expected: a non-empty array of sb-* keys (Supabase auth tokens present)
uvx browser-use --session findone-prod-verify eval 'window.__r=null; fetch("/server/api/jobs", {headers: {Authorization: "Bearer " + JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith("sb-")))).access_token}}).then(r => r.text().then(b => window.__r={status: r.status, body: b.slice(0, 200)})); "ok"'
sleep 3
uvx browser-use --session findone-prod-verify eval 'JSON.stringify(window.__r)'
# expected: {"status": 200, "body": "[...jobs array...]"} — confirms /server/api/jobs reaches FastAPI
uvx browser-use --session findone-prod-verify close
```

If the fetch returns `404`, Vercel is not stripping `/server` as expected — re-check `routePrefix` in `vercel.json`.
If the fetch returns `401` with a valid token in `Authorization`, check that `VITE_API_URL=/server` is in the Preview env (Task 5 Step 3).
If the fetch returns `500`, pull the function logs: `vercel logs $PREVIEW_URL --follow` and inspect the stack trace — the most likely cause is `includeFiles: "backend/**"` not shipping the backend package.

- [ ] **Step 5: Exercise one write path to confirm CORS is not triggering in prod**

In the same browser-use session (after re-login if needed), visit the Profile page and save any field. Expected: no CORS error in DevTools console (same-origin now). If you see a CORS error, `settings.frontend_url` is still being consulted somewhere unexpectedly — inspect request headers.

---

## Task 7: Merge to `main` and verify production

**Files:** none (git/CI, Vercel)

- [ ] **Step 1: Merge the PR**

Run: `gh pr merge $PR --squash --delete-branch=false`
Expected: PR merges; Vercel triggers a production deploy from `main`.

- [ ] **Step 2: Wait for the production deployment to go live**

Run: `gh run watch` (for the CI pipeline) and then check Vercel: `vercel ls find-one --prod --limit 1`.
Expected: Latest production deployment shows status `Ready`.

- [ ] **Step 3: Re-run the Python version check on the production build logs**

Same procedure as Task 6 Step 1, but for the production deployment.
Expected: `Using CPython 3.12.x`.

- [ ] **Step 4: Smoke-test the production URL end-to-end**

Repeat the browser-use sequence from Task 6 Step 4 against the production URL (`https://find-one.vercel.app` or whichever custom domain applies). Expected: login works, `/server/api/jobs` returns 200 with the user's job list.

- [ ] **Step 5: Close the loop**

Reply to the community post (https://community.vercel.com/t/python-version-pyproject-toml-and-pipfile-lock-all-ignored-builder-forces-cpython-3-14-3/38795/4) confirming gscho's suggestion worked, so future readers with the same symptom find a verified outcome.

---

## Rollback Procedure (if any verification step fails and can't be fixed inline)

If production goes red after Task 7:

- [ ] **Step 1: Identify the offending commit**

Run: `git log --oneline main -n 5`
Find the commit with `feat(vercel): migrate to Services`.

- [ ] **Step 2: Revert it**

Run: `git checkout main && git revert <commit_sha> && git push origin main`
Expected: Vercel auto-deploys the reverted state. The app goes back to the previous (broken-Python-version-but-otherwise-working) config. That is a step backward on the original issue but a step forward on availability.

- [ ] **Step 3: Roll back the Vercel dashboard changes**

Undo Task 5 steps: Framework Preset back to its previous value, and delete the two `VITE_API_URL=/server` entries (keep only the local-dev value on Development, if any).

- [ ] **Step 4: Re-plan**

File a follow-up note in this plan (new section at the bottom) describing what failed, then re-brainstorm with the user.
