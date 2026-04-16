# Follow-ups

Tracks known issues and deferred work that didn't fit into the current
initiative but must be addressed. Not a wishlist — every item here is a
real bug or gap with user impact.

## URL extraction fails on SPA job boards

**Reported:** 2026-04-15 · Paper Trail refactor testing phase
**Severity:** High — the `POST /api/search/url` endpoint silently returns
garbage for a large share of real-world URLs.

### Observed

Calling `/api/search/url` with `https://jobs.ea.com/en_US/careers/JobDetail/...`
returns HTTP 200 with:

```json
{
  "url":         "<original url>",
  "title":       "Electronic Arts",
  "description": "",
  "company":     "",
  "location":    ""
}
```

`title` is the `<title>` tag of the shell HTML (the company, not the job).
Every other field is an empty string. The frontend Paper Trail `JobSearch`
page displays this as a card reading `Electronic Arts` over `" · "` (empty
company · empty location) with an enabled "Ajouter" button that would
create a candidacy with no usable data.

### Root cause

`backend/app/services/scraper.py` uses `requests` + BeautifulSoup. It only
sees the HTML the server returns on the initial GET. Modern career portals
(EA, LinkedIn, Welcome to the Jungle, Workday, Greenhouse, Lever, …) are
single-page apps — the body is near-empty in the initial response and the
job content is rendered client-side by JavaScript that never runs in a
requests/BS4 pipeline.

### Options (ordered by effort/cost)

1. **Frontend guardrails** (quick win, ~30 min):
   - Detect empty-scrape results (`!company || !description`) and surface
     a clear message: "This posting could not be extracted automatically.
     Paste the description manually." Hide the "Add" button in that case.
   - Replace `?? '—'` with `|| '—'` so empty strings also fall back.
   - Note: mitigates user confusion; does NOT fix extraction.

2. **Replace the scraper with `playwright-python`** (1 day):
   - Render the page in a headless Chromium, wait for network-idle, then
     extract post-hydration DOM via CSS selectors. Keeps Claude out of the
     hot path (cost-free). Adds ~400 MB to the backend Docker image and
     5–15 s per scrape. Async-compatible via `playwright.async_api`.
   - Concurrency and memory will need bounding (semaphore + per-request
     timeout) to avoid DoS-ing our own server.

3. **Dedicated scraping service** (½ day integration):
   - ScrapingBee, ZenRows, ScraperAPI. Pay-per-request, they manage the
     Chromium fleet and anti-bot evasion. No Chromium in our image. ~$50–
     $100/month at low volume.

4. **`browser-use` on the backend** (deferred — see previous discussion):
   - Same capabilities as option 2 plus AI-assisted extraction, at the
     cost of an Anthropic API call per scrape. Not worth the extra
     latency/cost when option 2 covers the need.

### Recommendation

Do option 1 immediately as a standalone frontend fix — it prevents bad
data from entering the user's candidature list right now. Then plan a
proper backend fix (option 2 first; option 3 if anti-bot becomes the
dominant failure mode).

### Acceptance criteria for "fixed"

- URL extraction on a representative SPA (EA, LinkedIn, Welcome to the
  Jungle) returns a populated `title`, `company`, and `description`.
- Timeout after 20 s with a clear error rather than empty fields.
- Concurrency capped so a single user cannot exhaust worker pool.

---

## ZAP authenticated scan against protected routes

**Reported:** 2026-04-15 · ZAP hardening session
**Severity:** Low — scan coverage gap, not a security regression.

The CI `OWASP ZAP baseline scan (authenticated)` step enumerates all 57
OpenAPI-declared endpoints (via `zap-api-scan.py` on `/openapi.json`)
and injects `Authorization: Bearer <SUPABASE_SERVICE_KEY>` on every
request through `zap_auth_hook.py`. BUT: Supabase service-role JWTs
have no `sub` claim, and `backend/app/services/auth.py:validate_supabase_jwt`
correctly rejects them — so ZAP's 59 authenticated requests all get
401s. Passive header/cookie checks still run on those responses, but
route-logic vulnerabilities (stored XSS, IDOR, auth bypass, SQL
injection through params, etc.) aren't tested.

### Fix

Create a dedicated test user in Supabase and wire CI to exchange
credentials for a real user access_token before the scan:

1. Supabase dashboard → Authentication → Users → invite
   `zap-ci@<domain>` with a password only used for CI.
2. Add to the GitHub `staging` environment:
   - `ZAP_TEST_EMAIL`
   - `ZAP_TEST_PASSWORD`
3. Before the `docker run … zap-api-scan.py …` line, curl Supabase to
   fetch the access_token:
   ```bash
   TOKEN=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
     -H "apikey: ${SUPABASE_ANON_KEY}" \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"${ZAP_TEST_EMAIL}\",\"password\":\"${ZAP_TEST_PASSWORD}\"}" \
     | jq -r .access_token)
   export ZAP_AUTH_TOKEN="$TOKEN"
   ```
   (Anon key is safe to expose via env. Password never leaves the
   runner.)
4. The existing hook picks up `ZAP_AUTH_TOKEN` unchanged — no further
   workflow changes needed.

### Do NOT fix by

Accepting service-role JWTs without a `sub` claim in
`validate_supabase_jwt`. That would add a production admin-auth path
to satisfy a CI concern — a real security regression masquerading as a
testing convenience.

---

## Add `tsc --noEmit` to frontend CI

**Reported:** 2026-04-15 · Paper Trail refactor final verification
**Severity:** Low — quality gate, not a user-facing bug.

CI (`.github/workflows/ci-pipeline.yml`) runs `npm run test:run` and
`npm run lint` but not `npm run build` or `tsc --noEmit`. That's how
several type errors (`import.meta.env` untyped, missing vitest globals,
`string.replaceAll` needing ES2021+) lived in `main` for weeks without
anyone noticing — they only surface when someone runs `npm run build`
locally. Fixed in commit 611d090.

### Fix

Add a step to the `lint-and-test` job:

```yaml
      - name: Frontend — tsc
        working-directory: frontend
        run: npx tsc --noEmit
```

Place it right after `Frontend — vitest` and before `Frontend — eslint`
so a type error fails fast.
