# Frontend Read-Contract Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the BE→FE response-shape contract on the frontend side, catching typos like `data.gen_instructions` vs `data.generation_instructions` before they ship. Mirror on the FE the coverage that PR #34 added on the BE.

**Architecture:** Six new component tests mount each page/component with `vi.mock('../lib/api')` returning a known-shape JSON response, then assert the rendered DOM contains values only present when the expected keys are read. If a future refactor renames a key on either side without updating the other, the test fails with a concrete "could not find text" error. No MSW, no network — pure Vitest + React Testing Library, consistent with the existing `StatusBadge.test.tsx` pattern.

**Tech Stack:** Vitest 4, `@testing-library/react` 16, `@testing-library/jest-dom` 6, jsdom 29, React Router v6 (`MemoryRouter`), Zustand (mocked via `vi.mock`).

---

## File Structure

- `frontend/src/tests/__helpers__/mockApiFetch.ts` — shared helper to build an `apiFetch` mock that routes by path+method to canned responses. Single point of maintenance when the API surface changes.
- `frontend/src/tests/Profile.test.tsx` — Profile reads `generation_instructions`, `preferred_language`.
- `frontend/src/tests/Dashboard.test.tsx` — Dashboard reads `JobOffer[]` with `title`, `company`, `status`, `id`.
- `frontend/src/tests/JobDetail.test.tsx` — JobDetail reads `JobOffer` full shape + `Template[]`.
- `frontend/src/tests/Templates.test.tsx` — Templates reads `id`, `name`, `job_type`, `file_type`.
- `frontend/src/tests/JobSearch.test.tsx` — JobSearch reads `SearchResult[]` with `title`, `company`, `location`.
- `frontend/src/tests/JobForm.test.tsx` — JobForm round-trips `JobOffer` — initialData populates inputs, POST response is forwarded to `onSave`.

**Naming convention:** test files live next to the existing `StatusBadge.test.tsx` in `frontend/src/tests/`, matching current project layout.

**Branch:** `feat/frontend-read-contract-tests` (per feedback memory: trunk-based, feature branch PRs directly to main).

---

## Task 1: Shared `apiFetch` mock helper

**Files:**
- Create: `frontend/src/tests/__helpers__/mockApiFetch.ts`

**Rationale:** every test needs to mock `apiFetch` with a path→response map. Writing the router inline six times is duplication and makes it harder to update when the contract changes. A 30-line helper pays for itself by test #2.

- [ ] **Step 1: Create the helper file**

Create `frontend/src/tests/__helpers__/mockApiFetch.ts`:

```typescript
import { vi } from 'vitest'

export type MockRoute = {
  path: string | RegExp
  method?: string
  body: unknown
  status?: number
}

/**
 * Build a mock `apiFetch` implementation that matches incoming requests
 * against a list of routes and returns a Response-like object whose
 * `.json()` resolves to the configured `body`.
 *
 * Unmatched calls throw loudly so tests fail with a clear message
 * instead of silently returning undefined.
 */
export function buildApiFetchMock(routes: MockRoute[]) {
  return vi.fn(async (path: string, options?: RequestInit) => {
    const method = (options?.method ?? 'GET').toUpperCase()
    const route = routes.find((r) => {
      if (r.method && r.method.toUpperCase() !== method) return false
      return typeof r.path === 'string' ? r.path === path : r.path.test(path)
    })
    if (!route) {
      throw new Error(`[mockApiFetch] no route for ${method} ${path}`)
    }
    return {
      ok: true,
      status: route.status ?? 200,
      json: async () => route.body,
    } as unknown as Response
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors. The helper is not yet imported anywhere — we only need the type-check to pass.

- [ ] **Step 3: Commit**

```bash
git checkout -b feat/frontend-read-contract-tests
git add frontend/src/tests/__helpers__/mockApiFetch.ts
git commit -m "test(frontend): add shared apiFetch mock helper for read-contract tests"
```

---

## Task 2: Profile.tsx read-contract test

**Files:**
- Create: `frontend/src/tests/Profile.test.tsx`

**What we lock:** `GET /api/profile` returns `{ generation_instructions, preferred_language }`. The component must read both keys. See `frontend/src/pages/Profile.tsx:30-33`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/Profile.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const apiFetchMock = buildApiFetchMock([
  {
    path: '/api/profile',
    method: 'GET',
    body: {
      generation_instructions: 'Mettez en avant mes 8 ans en backend.',
      preferred_language: 'en',
    },
  },
])

vi.mock('../lib/api', () => ({
  apiFetch: apiFetchMock,
}))

// Import AFTER vi.mock so the module picks up the mock.
import Profile from '../pages/Profile'

describe('Profile (read contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('renders generation_instructions from GET /api/profile', async () => {
    render(<Profile />)
    const textarea = await screen.findByLabelText(/Instructions personnelles/i)
    expect(textarea).toHaveValue('Mettez en avant mes 8 ans en backend.')
  })

  it('renders preferred_language from GET /api/profile', async () => {
    render(<Profile />)
    const select = await screen.findByLabelText(/Langue des documents/i)
    await waitFor(() => expect(select).toHaveValue('en'))
  })
})
```

- [ ] **Step 2: Run test to verify it passes (it should — the component already reads those keys)**

Run: `cd frontend && npx vitest run src/tests/Profile.test.tsx`
Expected: 2 tests PASS. If a test fails with "expected '' to equal ...", the mock isn't hooked up — check the `vi.mock` path is relative to the test file (`../lib/api`, not `@/lib/api`).

- [ ] **Step 3: Prove the test actually catches a rename**

Temporarily edit `frontend/src/pages/Profile.tsx:31` from `data.generation_instructions` to `data.gen_instructions`.
Run: `cd frontend && npx vitest run src/tests/Profile.test.tsx`
Expected: the first test FAILS with the textarea value being empty string instead of the canned text. Revert the edit before continuing.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/tests/Profile.test.tsx
git commit -m "test(frontend): lock GET /api/profile read contract"
```

---

## Task 3: Dashboard.tsx read-contract test

**Files:**
- Create: `frontend/src/tests/Dashboard.test.tsx`

**What we lock:** `GET /api/jobs` returns `JobOffer[]`. Dashboard reads `id`, `title`, `company`, `status` (via `JobCardPT`) and computes counts from `status === 'interview_scheduled'` / `'offer_received'`. See `frontend/src/pages/Dashboard.tsx:41-57`.

**Dependency note:** Dashboard uses `useAuthStore((s) => s.user)` to build the greeting. We mock the store so the test doesn't touch Supabase.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/Dashboard.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const apiFetchMock = buildApiFetchMock([
  {
    path: '/api/jobs',
    method: 'GET',
    body: [
      {
        id: 'job-1',
        title: 'Staff Engineer',
        company: 'Acme Corp',
        status: 'applied',
      },
      {
        id: 'job-2',
        title: 'Backend Lead',
        company: 'Globex',
        status: 'interview_scheduled',
      },
      {
        id: 'job-3',
        title: 'Principal Engineer',
        company: 'Initech',
        status: 'offer_received',
      },
    ],
  },
])

vi.mock('../lib/api', () => ({ apiFetch: apiFetchMock }))

vi.mock('../stores/authStore', () => ({
  useAuthStore: (selector: (s: { user: { email: string } }) => unknown) =>
    selector({ user: { email: 'alice@example.com' } }),
}))

import Dashboard from '../pages/Dashboard'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

describe('Dashboard (read contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('renders title + company for each JobOffer from GET /api/jobs', async () => {
    renderDashboard()
    expect(await screen.findByText('Staff Engineer')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Backend Lead')).toBeInTheDocument()
    expect(screen.getByText('Globex')).toBeInTheDocument()
  })

  it('counts interview_scheduled + offer_received from status field', async () => {
    renderDashboard()
    // Wait for the list to render (proves load() finished).
    await screen.findByText('Staff Engineer')

    // Stat cards render label + numeric value. The "Entretiens" card should show 1,
    // the "Offres" card should show 1. Query by the label, walk up to the Card,
    // and read the numeric child.
    const interviewsLabel = screen.getByText('Entretiens')
    const interviewsCard = interviewsLabel.parentElement!
    expect(interviewsCard.textContent).toMatch(/1/)

    const offersLabel = screen.getByText('Offres')
    const offersCard = offersLabel.parentElement!
    expect(offersCard.textContent).toMatch(/1/)
  })

  it('derives the greeting name from the authenticated user email', async () => {
    renderDashboard()
    expect(await screen.findByText(/Alice/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/tests/Dashboard.test.tsx`
Expected: 3 tests PASS.

If the second test fails because `parentElement` doesn't contain the count, open `frontend/src/pages/Dashboard.tsx:17-28` and adjust the selector to match the `Stat` markup — the card is a two-div structure, so `parentElement` should work, but the exact nesting may differ.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/tests/Dashboard.test.tsx
git commit -m "test(frontend): lock GET /api/jobs read contract on Dashboard"
```

---

## Task 4: JobDetail.tsx read-contract test

**Files:**
- Create: `frontend/src/tests/JobDetail.test.tsx`

**What we lock:** `GET /api/jobs/:id` returns full `JobOffer`, `GET /api/templates` returns `Template[]`. JobDetail reads `title`, `company`, `location`, `contract_type`, `salary`, `url`, `recruiter_name`, `applied_at`, `followup_date`, `interview_date`, `notes`, `status`, `id`. See `frontend/src/pages/JobDetail.tsx:62-79`.

**Dependency note:** JobDetail imports `DocViewer`, which likely makes its own `apiFetch` calls. We stub `DocViewer` to a no-op so this test only exercises JobDetail's own reads.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/JobDetail.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const apiFetchMock = buildApiFetchMock([
  {
    path: '/api/jobs/job-42',
    method: 'GET',
    body: {
      id: 'job-42',
      title: 'Staff Platform Engineer',
      company: 'Contoso',
      url: 'https://contoso.example/careers/42',
      location: 'Paris, France',
      salary: '85-110k€',
      contract_type: 'CDI',
      recruiter_name: 'Marie Dupont',
      status: 'applied',
      applied_at: '2026-04-10',
      followup_date: '2026-04-20',
      interview_date: '2026-04-30',
      notes: 'Équipe Platform. Contact via LinkedIn.',
    },
  },
  {
    path: '/api/templates',
    method: 'GET',
    body: [],
  },
])

vi.mock('../lib/api', () => ({ apiFetch: apiFetchMock }))

// DocViewer has its own API calls — stub it so JobDetail's test is hermetic.
vi.mock('../components/DocViewer', () => ({
  DocViewer: () => <div data-testid="docviewer-stub" />,
}))

// JobForm is rendered only after clicking "Modifier"; stub to a no-op
// so we don't need to mount its whole modal tree.
vi.mock('../components/JobForm', () => ({
  JobForm: () => null,
}))

import JobDetail from '../pages/JobDetail'

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/jobs/job-42']}>
      <Routes>
        <Route path="/jobs/:id" element={<JobDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('JobDetail (read contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('renders title, company, status label from JobOffer', async () => {
    renderDetail()
    expect(await screen.findByText('Staff Platform Engineer')).toBeInTheDocument()
    // Company appears in the eyebrow.
    expect(screen.getByText('Contoso')).toBeInTheDocument()
    // "applied" → "Candidature envoyée" via STATUS_LABELS.
    expect(screen.getByText('Candidature envoyée')).toBeInTheDocument()
  })

  it('renders location, contract_type, salary in subtitle', async () => {
    renderDetail()
    await screen.findByText('Staff Platform Engineer')
    // They are joined with " · ".
    expect(screen.getByText(/Paris, France/)).toBeInTheDocument()
    expect(screen.getByText(/CDI/)).toBeInTheDocument()
    expect(screen.getByText(/85-110k€/)).toBeInTheDocument()
  })

  it('renders url, recruiter_name, applied_at, followup_date, interview_date, notes', async () => {
    renderDetail()
    await screen.findByText('Staff Platform Engineer')
    expect(screen.getByText('https://contoso.example/careers/42')).toBeInTheDocument()
    expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
    expect(screen.getByText('2026-04-10')).toBeInTheDocument()
    expect(screen.getByText('2026-04-20')).toBeInTheDocument()
    expect(screen.getByText('2026-04-30')).toBeInTheDocument()
    expect(screen.getByText(/Équipe Platform/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/tests/JobDetail.test.tsx`
Expected: 3 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/tests/JobDetail.test.tsx
git commit -m "test(frontend): lock GET /api/jobs/:id read contract on JobDetail"
```

---

## Task 5: Templates.tsx read-contract test

**Files:**
- Create: `frontend/src/tests/Templates.test.tsx`

**What we lock:** `GET /api/templates` returns items with `id`, `name`, `job_type`, `file_type`, `created_at`. Component reads the first four. See `frontend/src/pages/Templates.tsx:152-177`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/Templates.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const apiFetchMock = buildApiFetchMock([
  {
    path: '/api/templates',
    method: 'GET',
    body: [
      {
        id: 'tpl-1',
        name: 'CV senior full-stack',
        job_type: 'Développeur',
        file_type: 'pdf',
        created_at: '2026-03-01T12:00:00Z',
      },
      {
        id: 'tpl-2',
        name: 'Lettre de motivation',
        job_type: null,
        file_type: 'docx',
        created_at: '2026-03-02T12:00:00Z',
      },
    ],
  },
])

vi.mock('../lib/api', () => ({ apiFetch: apiFetchMock }))

import Templates from '../pages/Templates'

describe('Templates (read contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('renders name + job_type + file_type for each template', async () => {
    render(<Templates />)
    expect(await screen.findByText('CV senior full-stack')).toBeInTheDocument()
    expect(screen.getByText('Développeur')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()

    expect(screen.getByText('Lettre de motivation')).toBeInTheDocument()
    expect(screen.getByText('DOCX')).toBeInTheDocument()
  })

  it('falls back to "Type non spécifié" when job_type is null', async () => {
    render(<Templates />)
    await screen.findByText('Lettre de motivation')
    expect(screen.getByText('Type non spécifié')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/tests/Templates.test.tsx`
Expected: 2 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/tests/Templates.test.tsx
git commit -m "test(frontend): lock GET /api/templates read contract"
```

---

## Task 6: JobSearch.tsx read-contract test

**Files:**
- Create: `frontend/src/tests/JobSearch.test.tsx`

**What we lock:** `GET /api/search/jobs?query=...` and `POST /api/search/url` both return objects/arrays with `title`, `company`, `location`, `description`, `url`. See `frontend/src/pages/JobSearch.tsx:12-18, 54-82`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/JobSearch.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const apiFetchMock = buildApiFetchMock([
  {
    path: /^\/api\/search\/jobs\?/,
    method: 'GET',
    body: [
      {
        title: 'Senior Backend Engineer',
        company: 'OpenPayments',
        location: 'Remote EU',
        description: 'Build the payment rail.',
        url: 'https://example.com/openpay-1',
      },
    ],
  },
  {
    path: '/api/search/url',
    method: 'POST',
    body: {
      title: 'Scraped Role',
      company: 'ScrapedCo',
      location: 'Lyon',
      description: 'Imported description.',
      url: 'https://scraped.example/role',
    },
  },
])

vi.mock('../lib/api', () => ({ apiFetch: apiFetchMock }))

vi.mock('../components/JobForm', () => ({
  JobForm: () => null,
}))

import JobSearch from '../pages/JobSearch'

describe('JobSearch (read contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('renders title, company, location from /api/search/jobs results', async () => {
    const user = userEvent.setup()
    render(<JobSearch />)

    await user.type(screen.getByPlaceholderText(/Développeur full-stack/i), 'backend')
    await user.click(screen.getByRole('button', { name: /Rechercher$/i }))

    expect(await screen.findByText('Senior Backend Engineer')).toBeInTheDocument()
    // Company + location are in the same subtitle, joined with " · ".
    expect(screen.getByText(/OpenPayments/)).toBeInTheDocument()
    expect(screen.getByText(/Remote EU/)).toBeInTheDocument()
  })

  it('renders title, company, location from /api/search/url result', async () => {
    const user = userEvent.setup()
    render(<JobSearch />)

    // Switch to the "Importer une URL" tab.
    await user.click(screen.getByRole('button', { name: /Importer une URL/i }))
    await user.type(screen.getByLabelText(/URL de l'offre/i), 'https://scraped.example/role')
    await user.click(screen.getByRole('button', { name: /Extraire$/i }))

    await waitFor(() =>
      expect(screen.getByText('Scraped Role')).toBeInTheDocument()
    )
    expect(screen.getByText(/ScrapedCo/)).toBeInTheDocument()
    expect(screen.getByText(/Lyon/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Add `@testing-library/user-event` to frontend devDependencies if not already present**

Run: `cd frontend && npm ls @testing-library/user-event 2>/dev/null || npm install --save-dev @testing-library/user-event@^14.5.2`
Expected: either the package is already installed (no-op) or it gets added to `package.json`.

- [ ] **Step 3: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/tests/JobSearch.test.tsx`
Expected: 2 tests PASS.

If the "Importer une URL" tab toggles via a div-styled-as-button and `getByRole('button')` doesn't find it, fall back to `getByText(/Importer une URL/i)` — open `frontend/src/components/ui/FilterTabs.tsx` to check the markup.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/tests/JobSearch.test.tsx frontend/package.json frontend/package-lock.json
git commit -m "test(frontend): lock /api/search/{jobs,url} read contract on JobSearch"
```

---

## Task 7: JobForm.tsx round-trip test

**Files:**
- Create: `frontend/src/tests/JobForm.test.tsx`

**What we lock:**
1. **READ side:** when `initialData` is passed (edit flow), every `JobOffer` key we care about is wired to an input. If `JobOffer.contract_type` gets renamed to `contract` on the type, the `initialData?.contract_type` read in `JobForm.tsx:34` silently produces `undefined` and this test catches it.
2. **WRITE→response-read side:** after submit, the `POST /api/jobs` response is parsed as JSON and passed to `onSave`. If the backend ever returns something with a different shape, `onSave` receives it — the test asserts the callback was invoked with the canned response object.

See `frontend/src/components/JobForm.tsx:28-82`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/tests/JobForm.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { buildApiFetchMock } from './__helpers__/mockApiFetch'

const createResponse = {
  id: 'created-1',
  title: 'Staff Engineer',
  company: 'Acme',
  status: 'to_apply',
}

const apiFetchMock = buildApiFetchMock([
  {
    path: '/api/jobs',
    method: 'POST',
    body: createResponse,
  },
])

vi.mock('../lib/api', () => ({ apiFetch: apiFetchMock }))

import { JobForm } from '../components/JobForm'

describe('JobForm (round-trip contract)', () => {
  beforeEach(() => {
    apiFetchMock.mockClear()
  })

  it('populates every input from initialData (JobOffer shape)', () => {
    const initial = {
      id: 'j-1',
      title: 'Senior Dev',
      company: 'Contoso',
      url: 'https://contoso.example',
      location: 'Paris',
      salary: '70k€',
      contract_type: 'cdi',
      recruiter_name: 'M. Dupont',
      status: 'applied',
      applied_at: '2026-04-01',
      followup_date: '2026-04-10',
      interview_date: '2026-04-20',
      notes: 'Great team.',
    }

    render(<JobForm initialData={initial} onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByLabelText(/Poste/i)).toHaveValue('Senior Dev')
    expect(screen.getByLabelText(/Entreprise/i)).toHaveValue('Contoso')
    expect(screen.getByLabelText(/URL de l'offre/i)).toHaveValue('https://contoso.example')
    expect(screen.getByLabelText(/Lieu/i)).toHaveValue('Paris')
    expect(screen.getByLabelText(/Salaire/i)).toHaveValue('70k€')
    expect(screen.getByLabelText(/Type de contrat/i)).toHaveValue('cdi')
    expect(screen.getByLabelText(/Recruteur/i)).toHaveValue('M. Dupont')
    expect(screen.getByLabelText(/^Statut$/i)).toHaveValue('applied')
    expect(screen.getByLabelText(/Date de candidature/i)).toHaveValue('2026-04-01')
    expect(screen.getByLabelText(/Date de relance/i)).toHaveValue('2026-04-10')
    expect(screen.getByLabelText(/Date d'entretien/i)).toHaveValue('2026-04-20')
    expect(screen.getByLabelText(/Notes/i)).toHaveValue('Great team.')
  })

  it('forwards the POST /api/jobs response to onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<JobForm onSave={onSave} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText(/Poste/i), 'Staff Engineer')
    await user.type(screen.getByLabelText(/Entreprise/i), 'Acme')
    await user.click(screen.getByRole('button', { name: /Ajouter l'offre/i }))

    // Wait for the async submit to resolve.
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith(createResponse)
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/tests/JobForm.test.tsx`
Expected: 2 tests PASS.

If `getByLabelText(/^Statut$/i)` is ambiguous (matches another label too), make it a more specific match on the field's id `jf-status`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/tests/JobForm.test.tsx
git commit -m "test(frontend): lock JobOffer round-trip contract on JobForm"
```

---

## Task 8: Run full frontend test suite, simplify, open PR

**Files:** (no new files)

- [ ] **Step 1: Run the complete frontend test suite**

Run: `cd frontend && npm run test:run`
Expected: all tests (StatusBadge, authStore + the 6 new files) PASS. If any flake, fix before proceeding.

- [ ] **Step 2: Run lint**

Run: `cd frontend && npm run lint`
Expected: zero errors, zero warnings.

If eslint complains about `@testing-library/user-event` being unused in some file, remove the import.

- [ ] **Step 3: Invoke the `/simplify` skill on the diff**

This is required by CLAUDE.md rule #3 before committing. Run the skill; apply its findings if any; re-run `npm run test:run` after changes.

- [ ] **Step 4: Push branch + open PR**

```bash
git push -u origin feat/frontend-read-contract-tests
gh pr create --base main \
  --title "test(frontend): lock BE→FE read contract with component tests" \
  --body "$(cat <<'EOF'
## Summary

Mirrors PR #34 (backend response-shape lock) on the frontend side. Adds `vi.mock('../lib/api')`-based component tests for Profile, Dashboard, JobDetail, Templates, JobSearch, and JobForm. Each test asserts that the component actually reads the keys the backend returns — a rename on either side without updating the other now fails CI.

## Test plan

- [x] `cd frontend && npm run test:run` passes locally
- [x] `cd frontend && npm run lint` passes with zero warnings
- [x] Spot-check: temporarily renamed `data.generation_instructions` → `data.gen_instructions` in Profile.tsx and confirmed the new test fails
- [ ] CI green on the PR

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Monitor CI, let auto-merge run on green**

Per feedback memories, green CI auto-merges — no need to wait. Move to the next item on the open-follow-ups list (dead-code audit on `backend/app/api/auth.py`).

---

## Self-review notes

**Spec coverage:**
- Profile.tsx (READ) ✓ Task 2
- Dashboard.tsx (READ) ✓ Task 3
- JobDetail.tsx (READ) ✓ Task 4
- Templates.tsx (READ) ✓ Task 5
- JobSearch.tsx (READ) ✓ Task 6
- JobForm.tsx (round-trip) ✓ Task 7
- Shared infra ✓ Task 1
- Hand-off to CI ✓ Task 8

**Placeholder scan:** every step has concrete code or a concrete command. No "add appropriate error handling" or "similar to task N" references.

**Type consistency:** `buildApiFetchMock` signature is defined once in Task 1 and reused verbatim in Tasks 2-7. `MockRoute.path` accepts `string | RegExp` and both forms are used (strings everywhere except Task 6 which needs a regex for the query-string URL).

**Known risk:** Task 3's "count in stat card" assertion walks the DOM via `parentElement`. If the `Stat` component's markup changes, this test will need updating. Accepted — it's still more specific than the alternative (grepping the whole document for "1", which would be ambiguous).
