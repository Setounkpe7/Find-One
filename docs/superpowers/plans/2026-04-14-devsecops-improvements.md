# DevSecOps Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Find-One CI/CD pipeline with 7 automated improvements: blocking security scans, DAST with a real test database, Dependabot, SBOM generation, Trivy Docker scanning, GitHub Environments in the workflow, and an operations runbook.

**Architecture:** All changes are confined to `.github/workflows/ci-pipeline.yml`, a new `.github/dependabot.yml`, and a new `docs/RUNBOOK.md`. No application code changes. Branch protection and GitHub Environment creation are done manually in the GitHub UI (listed at the end).

**Tech Stack:** GitHub Actions, TruffleHog v3, pip-audit v2, npm audit, Bandit, Trivy, anchore/sbom-action, OWASP ZAP, Dependabot.

---

## Skill reminders (apply at every task)

- After each implementation task → invoke `simplify` skill on changed files
- Documentation → invoke `humanizer` skill
- Each task is assigned to a **dedicated sub-agent** — the sub-agent must invoke `simplify` on every file it modifies before committing

---

## File map

```
.github/
├── workflows/
│   └── ci-pipeline.yml        # Modified in Tasks 1, 2, 4, 5, 6
└── dependabot.yml             # Created in Task 3
docs/
└── RUNBOOK.md                 # Created in Task 7
```

---

### Task 1: Blocking Security Scans

**Sub-agent assignment:** Dispatch a fresh sub-agent with the full text of this task. The sub-agent must invoke the `simplify` skill on `ci-pipeline.yml` before committing.

**Context for sub-agent:** Find-One is a job application tracker. The CI pipeline lives at `.github/workflows/ci-pipeline.yml`. Currently all security scans use `|| true` which means they never block a merge even when they find real vulnerabilities. This task makes four scans blocking while keeping the others informational. Do not change anything outside the `security-scans` job.

**Files:**
- Modify: `.github/workflows/ci-pipeline.yml` (lines 121–193 — the four scan steps listed below)

---

- [ ] **Step 1: Read the current workflow**

```bash
cat .github/workflows/ci-pipeline.yml
```

Confirm the file exists and note the exact names of the TruffleHog, pip-audit, npm audit, and Bandit steps.

---

- [ ] **Step 2: Replace the TruffleHog step**

Find this block:

```yaml
      - name: TruffleHog
        env:
          REPORT_DIR: ${{ steps.report_dir.outputs.dir }}
          TS: ${{ steps.report_dir.outputs.ts }}
        run: |
          pip install trufflehog3 2>/dev/null || pip install trufflehog 2>/dev/null || true
          trufflehog git file://. --only-verified --json \
            > "${REPORT_DIR}/trufflehog_${TS}.json" 2>&1 || true
```

Replace it with:

```yaml
      - name: TruffleHog
        env:
          REPORT_DIR: ${{ steps.report_dir.outputs.dir }}
          TS: ${{ steps.report_dir.outputs.ts }}
        run: |
          pip install trufflehog3 2>/dev/null || pip install trufflehog 2>/dev/null || true
          trufflehog git file://. --only-verified --json \
            > "${REPORT_DIR}/trufflehog_${TS}.json" 2>&1 || true
          # Block if verified secrets were found (non-empty output = at least one secret)
          if [ -s "${REPORT_DIR}/trufflehog_${TS}.json" ]; then
            echo "::error::TruffleHog found verified secrets in git history."
            cat "${REPORT_DIR}/trufflehog_${TS}.json"
            exit 1
          fi
```

---

- [ ] **Step 3: Replace the pip-audit step**

Find:

```yaml
      - name: pip-audit
        env:
          REPORT_DIR: ${{ steps.report_dir.outputs.dir }}
          TS: ${{ steps.report_dir.outputs.ts }}
        run: |
          pip-audit -r backend/requirements.txt -f json \
            -o "${REPORT_DIR}/pip-audit_${TS}.json" 2>&1 || true
```

Replace with:

```yaml
      - name: pip-audit
        env:
          REPORT_DIR: ${{ steps.report_dir.outputs.dir }}
          TS: ${{ steps.report_dir.outputs.ts }}
        run: |
          # Always save the JSON report for artifact upload
          pip-audit -r backend/requirements.txt -f json \
            -o "${REPORT_DIR}/pip-audit_${TS}.json" 2>&1 || true
          # Block if any vulnerability found (pip-audit exits 1 when vulns exist)
          pip-audit -r backend/requirements.txt 2>&1 || {
            echo "::error::pip-audit found vulnerabilities in Python dependencies."
            exit 1
          }
```

---

- [ ] **Step 4: Replace the npm audit step**

Find:

```yaml
      - name: npm audit
        env:
          REPORT_DIR: ${{ steps.report_dir.outputs.dir }}
          TS: ${{ steps.report_dir.outputs.ts }}
        working-directory: frontend
        run: |
          npm audit --json > "../${REPORT_DIR}/npm-audit_${TS}.json" 2>&1 || true
```

Replace with:

```yaml
      - name: npm audit
        env:
          REPORT_DIR: ${{ steps.report_dir.outputs.dir }}
          TS: ${{ steps.report_dir.outputs.ts }}
        working-directory: frontend
        run: |
          # Always save the JSON report for artifact upload
          npm audit --json > "../${REPORT_DIR}/npm-audit_${TS}.json" 2>&1 || true
          # Block on CRITICAL severity only
          npm audit --audit-level=critical || {
            echo "::error::npm audit found CRITICAL vulnerabilities in JS dependencies."
            exit 1
          }
```

---

- [ ] **Step 5: Replace the Bandit step**

Find:

```yaml
      - name: Bandit
        env:
          REPORT_DIR: ${{ steps.report_dir.outputs.dir }}
          TS: ${{ steps.report_dir.outputs.ts }}
        run: |
          bandit -r backend/app/ -f json \
            -o "${REPORT_DIR}/bandit_${TS}.json" 2>&1 || true
```

Replace with:

```yaml
      - name: Bandit
        env:
          REPORT_DIR: ${{ steps.report_dir.outputs.dir }}
          TS: ${{ steps.report_dir.outputs.ts }}
        run: |
          # Always save the full JSON report for artifact upload
          bandit -r backend/app/ -f json \
            -o "${REPORT_DIR}/bandit_${TS}.json" 2>&1 || true
          # Block on HIGH severity + MEDIUM confidence (exit code 1 when issues found)
          bandit -r backend/app/ \
            --severity-level HIGH \
            --confidence-level MEDIUM \
            --quiet 2>&1 || {
            echo "::error::Bandit found HIGH severity issues in Python code."
            exit 1
          }
```

---

- [ ] **Step 6: Invoke `simplify` skill on the modified file**

Run the `simplify` skill on `.github/workflows/ci-pipeline.yml` before committing. Fix any issues it identifies.

---

- [ ] **Step 7: Verify the workflow is valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-pipeline.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

---

- [ ] **Step 8: Commit**

```bash
git add .github/workflows/ci-pipeline.yml
git commit -m "ci: make TruffleHog, pip-audit, npm audit (CRITICAL), and Bandit (HIGH) blocking"
```

---

### Task 2: DAST with Real Test Database

**Sub-agent assignment:** Dispatch a fresh sub-agent with the full text of this task. The sub-agent must invoke the `simplify` skill on `ci-pipeline.yml` before committing.

**Context for sub-agent:** The `security-scans` job in `.github/workflows/ci-pipeline.yml` currently starts the FastAPI backend with an empty `DATABASE_URL`. This means most endpoints return 500 errors and OWASP ZAP can barely scan anything. This task adds a PostgreSQL service to the `security-scans` job, runs Alembic migrations before ZAP, and starts the backend with a real test database URL. Do not touch the `lint-and-test` job.

**Files:**
- Modify: `.github/workflows/ci-pipeline.yml` (the `security-scans` job definition and the OWASP ZAP step)

---

- [ ] **Step 1: Read the current security-scans job header**

```bash
grep -n "security-scans\|services:\|postgres:\|OWASP ZAP" .github/workflows/ci-pipeline.yml
```

Note the line number where `security-scans:` starts and the line number of the OWASP ZAP step.

---

- [ ] **Step 2: Add PostgreSQL service to security-scans job**

The `security-scans` job currently has no `services:` block. Add one immediately after the `runs-on: ubuntu-latest` line of that job:

Find:

```yaml
  security-scans:
    name: Security Scans
    needs: lint-and-test
    runs-on: ubuntu-latest

    steps:
```

Replace with:

```yaml
  security-scans:
    name: Security Scans
    needs: lint-and-test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: findone
          POSTGRES_PASSWORD: findone
          POSTGRES_DB: findone_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
```

---

- [ ] **Step 3: Add an Alembic migration step before OWASP ZAP**

Find the existing OWASP ZAP step:

```yaml
      - name: OWASP ZAP baseline scan
```

Insert this new step immediately before it:

```yaml
      - name: Run Alembic migrations for ZAP test DB
        env:
          DATABASE_URL: postgresql://findone:findone@localhost:5432/findone_test
        run: |
          cd backend
          alembic upgrade head

```

(Keep a blank line between the new step and the OWASP ZAP step so the YAML stays readable.)

---

- [ ] **Step 4: Update the OWASP ZAP step to use the real test DB**

Find:

```yaml
      - name: OWASP ZAP baseline scan
        env:
          REPORT_DIR: ${{ steps.report_dir.outputs.dir }}
          TS: ${{ steps.report_dir.outputs.ts }}
        run: |
          docker pull ghcr.io/zaproxy/zaproxy:stable 2>/dev/null || true
          # Start the backend for ZAP to scan
          pip install -r backend/requirements.txt 2>/dev/null || true
          DATABASE_URL="" SUPABASE_URL="" SUPABASE_SERVICE_KEY="" \
            ANTHROPIC_API_KEY="" JSEARCH_API_KEY="" SECRET_KEY="zap-test" \
            uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
          sleep 5
```

Replace only the backend startup lines (keep the docker pull and the ZAP run lines unchanged):

```yaml
      - name: OWASP ZAP baseline scan
        env:
          REPORT_DIR: ${{ steps.report_dir.outputs.dir }}
          TS: ${{ steps.report_dir.outputs.ts }}
        run: |
          docker pull ghcr.io/zaproxy/zaproxy:stable 2>/dev/null || true
          # Start the backend with a real test database so endpoints are reachable
          DATABASE_URL="postgresql://findone:findone@localhost:5432/findone_test" \
            SUPABASE_URL="" SUPABASE_SERVICE_KEY="" \
            ANTHROPIC_API_KEY="" JSEARCH_API_KEY="" SECRET_KEY="zap-test" \
            uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
          sleep 5
```

Leave the rest of the ZAP step (the docker run commands) exactly as-is.

---

- [ ] **Step 5: Invoke `simplify` skill on the modified file**

Run the `simplify` skill on `.github/workflows/ci-pipeline.yml`. Fix any issues it identifies.

---

- [ ] **Step 6: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-pipeline.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

---

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/ci-pipeline.yml
git commit -m "ci: run OWASP ZAP against backend with real PostgreSQL test DB"
```

---

### Task 3: Dependabot Configuration

**Sub-agent assignment:** Dispatch a fresh sub-agent with the full text of this task. The sub-agent must invoke the `simplify` skill on `dependabot.yml` before committing.

**Context for sub-agent:** Find-One has no Dependabot configuration yet. This task creates `.github/dependabot.yml` to automate weekly dependency-update PRs for Python packages (in `backend/`), npm packages (in `frontend/`), and GitHub Actions. Each Dependabot PR goes through the full CI pipeline, so blocking scans catch any vulnerability introduced by the update.

**Files:**
- Create: `.github/dependabot.yml`

---

- [ ] **Step 1: Verify `.github/dependabot.yml` does not already exist**

```bash
ls .github/dependabot.yml 2>/dev/null && echo "EXISTS" || echo "NOT FOUND"
```

Expected: `NOT FOUND`. If it exists, read it first and extend rather than overwrite.

---

- [ ] **Step 2: Create `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: pip
    directory: /backend
    schedule:
      interval: weekly
      day: monday
    labels:
      - dependencies
      - python
    open-pull-requests-limit: 5

  - package-ecosystem: npm
    directory: /frontend
    schedule:
      interval: weekly
      day: monday
    labels:
      - dependencies
      - javascript
    open-pull-requests-limit: 5

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
    labels:
      - dependencies
      - github-actions
    open-pull-requests-limit: 3
```

---

- [ ] **Step 3: Invoke `simplify` skill on the new file**

Run the `simplify` skill on `.github/dependabot.yml`. Fix any issues it identifies.

---

- [ ] **Step 4: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

---

- [ ] **Step 5: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add Dependabot for weekly pip, npm, and Actions updates"
```

---

### Task 4: SBOM Generation

**Sub-agent assignment:** Dispatch a fresh sub-agent with the full text of this task. The sub-agent must invoke the `simplify` skill on `ci-pipeline.yml` before committing.

**Context for sub-agent:** Find-One needs a Software Bill of Materials (SBOM) attached to every PR so that the team can quickly assess exposure when a new CVE is published. This task adds `anchore/sbom-action` to the `security-scans` job in `.github/workflows/ci-pipeline.yml`. The SBOM is uploaded as a separate artifact named `sbom`. Do not remove or reorder any existing steps.

**Files:**
- Modify: `.github/workflows/ci-pipeline.yml` (add a step inside the `security-scans` job, after the `Upload security artifacts` step)

---

- [ ] **Step 1: Find the last step in security-scans**

```bash
grep -n "Upload security artifacts\|upload-artifact" .github/workflows/ci-pipeline.yml
```

Note the line number of the last `uses: actions/upload-artifact@v4` call.

---

- [ ] **Step 2: Add the SBOM step**

Add the following two steps at the end of the `security-scans` job, after the existing `Upload security artifacts` step:

```yaml
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          path: .
          format: spdx-json
          artifact-name: sbom.spdx.json

      - name: Upload SBOM artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: sbom-${{ steps.report_dir.outputs.ts }}
          path: sbom.spdx.json
          retention-days: 30
```

---

- [ ] **Step 3: Invoke `simplify` skill on the modified file**

Run the `simplify` skill on `.github/workflows/ci-pipeline.yml`. Fix any issues it identifies.

---

- [ ] **Step 4: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-pipeline.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

---

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci-pipeline.yml
git commit -m "ci: add SBOM generation via anchore/sbom-action on every PR"
```

---

### Task 5: Trivy Docker Image Scan

**Sub-agent assignment:** Dispatch a fresh sub-agent with the full text of this task. The sub-agent must invoke the `simplify` skill on `ci-pipeline.yml` before committing.

**Context for sub-agent:** Find-One has a backend `Dockerfile` at `backend/Dockerfile`. This task adds a Trivy scan of the built backend Docker image to the `security-scans` job in `.github/workflows/ci-pipeline.yml`. Trivy blocks the pipeline on CRITICAL CVEs. The full report is saved as a JSON artifact regardless. Do not touch any other job.

**Files:**
- Modify: `.github/workflows/ci-pipeline.yml` (add steps in `security-scans` before the `Generate security report` step)

---

- [ ] **Step 1: Find the Generate security report step**

```bash
grep -n "Generate security report" .github/workflows/ci-pipeline.yml
```

Note the line number. The Trivy steps will be inserted just before it.

---

- [ ] **Step 2: Add Trivy steps**

Insert the following two steps immediately before the `Generate security report` step:

```yaml
      - name: Build backend Docker image for Trivy
        run: docker build -t findone-backend:ci ./backend

      - name: Trivy — scan backend image
        env:
          REPORT_DIR: ${{ steps.report_dir.outputs.dir }}
          TS: ${{ steps.report_dir.outputs.ts }}
        run: |
          # Save full report (informational)
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v "$(pwd)/${REPORT_DIR}:/output" \
            aquasec/trivy:latest image \
            --format json \
            --output "/output/trivy_${TS}.json" \
            findone-backend:ci 2>&1 || true
          # Block on CRITICAL CVEs
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy:latest image \
            --exit-code 1 \
            --severity CRITICAL \
            --quiet \
            findone-backend:ci 2>&1 || {
            echo "::error::Trivy found CRITICAL CVEs in the backend Docker image."
            exit 1
          }
```

---

- [ ] **Step 3: Invoke `simplify` skill on the modified file**

Run the `simplify` skill on `.github/workflows/ci-pipeline.yml`. Fix any issues it identifies.

---

- [ ] **Step 4: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-pipeline.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

---

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci-pipeline.yml
git commit -m "ci: add Trivy Docker image scan — blocks on CRITICAL CVEs"
```

---

### Task 6: GitHub Environments in Workflow

**Sub-agent assignment:** Dispatch a fresh sub-agent with the full text of this task. The sub-agent must invoke the `simplify` skill on `ci-pipeline.yml` before committing.

**Context for sub-agent:** Find-One stores all secrets at the repository level, which means every job can access production secrets. This task scopes the `security-scans` job to the `staging` GitHub Environment so that environment-specific secrets (Supabase keys, Anthropic key, etc.) are only available to jobs that declare the environment. The actual environment and its secrets are created manually in the GitHub UI — this task only adds the `environment:` declaration to the workflow YAML. Do not change secret names or add new secrets to the YAML.

**Files:**
- Modify: `.github/workflows/ci-pipeline.yml` (add `environment:` key to the `security-scans` job)

---

- [ ] **Step 1: Find the security-scans job definition**

```bash
grep -n "security-scans:\|environment:" .github/workflows/ci-pipeline.yml
```

Confirm `environment:` is not already present in that job.

---

- [ ] **Step 2: Add environment declaration to security-scans**

Find:

```yaml
  security-scans:
    name: Security Scans
    needs: lint-and-test
    runs-on: ubuntu-latest
```

Replace with:

```yaml
  security-scans:
    name: Security Scans
    needs: lint-and-test
    runs-on: ubuntu-latest
    environment: staging
```

---

- [ ] **Step 3: Invoke `simplify` skill on the modified file**

Run the `simplify` skill on `.github/workflows/ci-pipeline.yml`. Fix any issues it identifies.

---

- [ ] **Step 4: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-pipeline.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

---

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci-pipeline.yml
git commit -m "ci: scope security-scans job to staging GitHub Environment"
```

---

### Task 7: Operations Runbook

**Sub-agent assignment:** Dispatch a fresh sub-agent with the full text of this task. The sub-agent must invoke the `humanizer` skill on `RUNBOOK.md` before committing.

**Context for sub-agent:** Find-One deploys to Vercel via GitHub Actions. There is no documented procedure for rolling back a bad deploy, responding to a security incident, or confirming the current production version. This task creates `docs/RUNBOOK.md` with those procedures. The Vercel project is named `find-one` and deploys from the `main` branch. Vercel handles deployments automatically on push to `main`.

**Files:**
- Create: `docs/RUNBOOK.md`

---

- [ ] **Step 1: Create `docs/RUNBOOK.md`**

```markdown
# Find-One Operations Runbook

This document covers the procedures you need when something goes wrong in production. Keep it short — if a procedure needs more than five steps, something is too complicated.

---

## Production rollback

Vercel keeps a full deployment history. Rolling back takes about 30 seconds and requires no code changes.

1. Open the [Vercel dashboard](https://vercel.com/dashboard) and navigate to the Find-One project.
2. Click **Deployments** in the left sidebar.
3. Find the last deployment with a green **Ready** badge before the bad one.
4. Click the three-dot menu on that deployment and select **Promote to Production**.
5. Confirm in the dialog. The previous version is live again within seconds.

To verify the rollback worked:

```bash
curl -s https://your-production-domain.vercel.app/api/health
# Expected: {"status": "ok"}
```

Replace `your-production-domain.vercel.app` with the actual Vercel domain.

---

## Confirming the current production version

Check which git commit is running in production:

1. Open the Vercel dashboard → Find-One → Deployments.
2. The top entry marked **Production** shows the commit SHA and message.

Or from the terminal (requires the Vercel CLI installed and authenticated):

```bash
vercel ls --prod
```

---

## Responding to a security alert

When a blocking CI scan fails on a PR, do not merge until the vulnerability is fixed.

**pip-audit or npm audit failed:**
1. Read the scan report artifact from the failed PR (GitHub Actions → security-scans → Artifacts).
2. Upgrade the vulnerable package to the patched version listed in the report.
3. Run `pip-audit -r backend/requirements.txt` or `npm audit fix` locally to confirm.
4. Commit the fix. The pre-commit hook will re-run pytest and vitest.
5. Push. The CI pipeline re-runs and must pass before merging.

**Bandit failed (HIGH severity Python issue):**
1. Read the bandit JSON artifact. Note the file, line, and issue ID (e.g., `B608` for SQL injection).
2. Fix the flagged code. Common fixes:
   - `B608` (SQL injection): use SQLAlchemy ORM instead of raw string queries.
   - `B105`/`B106` (hardcoded password): move the value to an environment variable.
   - `B324` (weak hash): replace `md5`/`sha1` with `sha256` or better.
3. Run `bandit -r backend/app/ --severity-level HIGH --confidence-level MEDIUM` locally to confirm the issue is gone.
4. Commit and push.

**TruffleHog found a verified secret:**
1. The secret is in git history. Rotating it is mandatory — it is compromised.
2. Immediately rotate the secret in the relevant service (Supabase, Anthropic, etc.).
3. Update the secret in GitHub Environments (Settings → Environments → staging / production).
4. Remove the secret from the code using `git filter-repo` (not `git filter-branch`):
   ```bash
   pip install git-filter-repo
   git filter-repo --sensitive-data-removal --path-glob "*.env" --invert-paths
   ```
   Then force-push and notify all collaborators to re-clone.
5. Re-run TruffleHog to confirm the history is clean.

**Trivy found a CRITICAL CVE in the Docker image:**
1. Read the Trivy JSON artifact. Note the package name and CVE ID.
2. Check whether a patched version of the base image or the OS package exists:
   ```bash
   docker run --rm aquasec/trivy:latest image --severity CRITICAL python:3.13-slim
   ```
3. If the fix is in a newer base image tag, update `FROM python:3.13-slim` in `backend/Dockerfile` to the patched tag.
4. If the fix is in a Python package, upgrade it in `requirements.txt`.
5. Commit and push. The pipeline re-runs Trivy.

---

## Database migrations

Migrations run automatically in the CI test database. For production (Supabase):

```bash
# From the repo root, with SUPABASE_DB_URL set in your shell
cd backend
DATABASE_URL="$SUPABASE_DB_URL" alembic upgrade head
```

Always run migrations before deploying new backend code that depends on schema changes.

---

## Emergency contacts

| Role | Contact |
|---|---|
| Repository owner | See GitHub repository settings |
| Vercel project owner | See Vercel team settings |
| Supabase project owner | See Supabase project settings |
```

---

- [ ] **Step 2: Invoke `humanizer` skill on `docs/RUNBOOK.md`**

Run the `humanizer` skill on `docs/RUNBOOK.md`. Apply its suggestions to make the text sound like it was written by a person, not generated by AI. Fix any patterns it flags.

---

- [ ] **Step 3: Commit**

```bash
git add docs/RUNBOOK.md
git commit -m "docs: add operations runbook (rollback, security incidents, migrations)"
```

---

## What you must do manually in GitHub

These changes cannot be automated — they require the GitHub UI or Vercel dashboard.

### 1. Branch protection on `main`

Go to **GitHub → Find-One repo → Settings → Branches → Add branch ruleset** (or "Add classic branch protection rule") for the `main` branch:

- [x] Require a pull request before merging
  - [x] Require 1 approving review
- [x] Require status checks to pass before merging
  - Add `Lint & Test` as a required check
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings
- [x] Restrict force pushes (leave unchecked = force push blocked)
- [x] Restrict deletions

### 2. Create GitHub Environments

Go to **GitHub → Find-One repo → Settings → Environments** and create two environments:

**Environment: `staging`**
- No approval gate
- Add these secrets (copy from your `.env` or Supabase dashboard):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `ANTHROPIC_API_KEY`
  - `JSEARCH_API_KEY`
  - `SECRET_KEY`

**Environment: `production`**
- Add a required reviewer (yourself) — this prevents any automated job from deploying to prod without approval
- Add the same five secrets with production values

### 3. Verify Vercel Preview Deployments

Go to **Vercel → Find-One project → Settings → Git** and confirm:
- Production branch is set to `main`
- Preview deployments are enabled for all branches (this is the default)

Every PR will automatically get a preview URL (e.g., `find-one-git-dev-username.vercel.app`). You can paste that URL into ZAP manually for a one-off DAST scan of the frontend.