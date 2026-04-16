# Paper Trail — React Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current inline-styled dark theme of the 7 React pages with the Paper Trail design system (warm beige parchment + espresso sidebar + Playfair Display / Lato typography) shown in `design-proposals/paper-trail/`, without changing any business logic, routing, API wiring or auth flows.

**Architecture:** Introduce one global CSS entrypoint (`frontend/src/styles/paper-trail.css`) carrying every design token and utility class from the mockup `_shared.css`. Build a set of presentational UI primitives under `frontend/src/components/ui/` (Button, Card, Badge, Input, Label, Field, Textarea, FilterTabs, IconButton, Sidebar, AppShell, JobCard-PaperTrail). Refactor each page bottom-up — simplest to most complex — so that each commit is a fully working app that passes `npm run test:run` and `npm run lint`. All Zustand state, API calls, and `react-router` wiring stay untouched.

**Tech Stack:** React 18.3, TypeScript, Vite, React Router v6.23, Zustand 4.5, Supabase JS 2.43, Vitest 4.1 + Testing Library 16, no CSS framework (plain CSS with custom properties).

---

## Test Philosophy for This Plan

Because this is a **pure presentational refactor** (no new behavior, no API or state changes), the behavioral harness is the **existing Vitest suite** (`frontend/src/tests/`) plus `npm run lint`. The design harness is **manual visual verification in the browser** (`npm run dev` → compare against the mockup in `design-proposals/paper-trail/`). We will NOT write new failing tests for each presentational component — that would be write-only ceremony. We WILL:

1. Run `npm run test:run` after every task. All existing tests must still pass.
2. Run `npm run lint` after every task. Zero warnings.
3. Run `npm run dev` and visually diff against the matching mockup after each page refactor.
4. Commit only after all three gates pass.

If an existing test breaks, inspect **before fixing** — we only accept a test change if it was relying on an inline style value that no longer applies. Behavior changes are out of scope.

---

## File Structure Map

### New files (created by this plan)

| Path | Responsibility |
|---|---|
| `frontend/src/styles/paper-trail.css` | Design tokens (CSS custom properties), base body, layout primitives (`.app-shell`, `.main`), typography, utilities. Imported once by `main.tsx`. |
| `frontend/src/components/ui/Button.tsx` | `<Button variant="primary\|secondary\|ghost" size="md\|sm\|lg">` |
| `frontend/src/components/ui/Card.tsx` | `<Card>` wrapping children with Paper Trail card styling. |
| `frontend/src/components/ui/Badge.tsx` | `<Badge variant="saved\|applied\|interview\|offer\|pending\|rejected">` |
| `frontend/src/components/ui/Field.tsx` | `<Field label hint>…</Field>` — wraps a label + input + hint. |
| `frontend/src/components/ui/Input.tsx` | `<Input>` styled text input. Forwards refs + native props. |
| `frontend/src/components/ui/Textarea.tsx` | `<Textarea>` styled textarea. |
| `frontend/src/components/ui/Select.tsx` | `<Select>` styled select. |
| `frontend/src/components/ui/FilterTabs.tsx` | `<FilterTabs tabs={[...]} active onChange />` pill-style filter row. |
| `frontend/src/components/ui/IconButton.tsx` | `<IconButton title aria-label>` — small circular ghost button. |
| `frontend/src/components/ui/Sidebar.tsx` | Full app sidebar: logo, nav, footer avatar. Uses `<NavLink>`. |
| `frontend/src/components/ui/AppShell.tsx` | `<AppShell>` = sidebar + `<main class="main">{children}</main>` layout wrapper. |
| `frontend/src/components/ui/PageHeader.tsx` | `<PageHeader eyebrow title subtitle actions />` composable page header. |
| `frontend/src/components/ui/StatusPill.tsx` | Renders a status pill using the job status value (re-export of Badge with logic). |
| `frontend/src/components/JobCardPT.tsx` | Paper Trail rewrite of `JobCard`. Coexists briefly with the old one to avoid one-shot breakage; old one deleted in Phase 3. |

### Modified files

| Path | What changes |
|---|---|
| `frontend/index.html` | `<link>` tags for Google Fonts (Playfair Display + Lato). |
| `frontend/src/main.tsx` | `import './styles/paper-trail.css'` at the top. |
| `frontend/src/App.tsx` | Protected routes wrapped in `<AppShell>` (single line change inside `ProtectedRoute`). |
| `frontend/src/pages/Login.tsx` | Full JSX rewrite using UI primitives. Logic/state untouched. |
| `frontend/src/pages/Register.tsx` | Full JSX rewrite. Logic untouched. |
| `frontend/src/pages/Profile.tsx` | Full JSX rewrite. API calls untouched. |
| `frontend/src/pages/Templates.tsx` | Full JSX rewrite. API calls untouched. |
| `frontend/src/pages/JobSearch.tsx` | Full JSX rewrite. API calls untouched. |
| `frontend/src/pages/JobDetail.tsx` | Full JSX rewrite. API calls untouched. |
| `frontend/src/pages/Dashboard.tsx` | Full JSX rewrite; uses `<JobCardPT>` instead of `<JobCard>`. |

### Deleted files (Phase 3)

| Path | Why |
|---|---|
| `frontend/src/pages/authStyles.ts` | Dark theme style object — no longer referenced. |
| `frontend/src/components/JobCard.tsx` | Replaced by `JobCardPT`; no consumers remain. |

### Untouched (do NOT edit)

- `frontend/src/stores/authStore.ts`
- `frontend/src/lib/api.ts`, `lib/types.ts`, `lib/supabase.ts`
- `frontend/src/components/JobForm.tsx`, `DocViewer.tsx`, `StatusBadge.tsx` (inner text badges — their logic depends on dates, untouched; only their visual style inherits from global CSS)
- `frontend/src/tests/**`
- Any backend, CI or config file

---

## Out-of-Scope Items (Noted for Future Plans)

The mockups show a few features the current app does not have. These are NOT implemented in this plan — we render static placeholders or omit them, and log them here:

1. **Match score** on `JobSearch` cards (e.g. "94% match") — no backend field today. Placeholder: do not render the match block.
2. **Pipeline funnel widget** on Dashboard ("Sauvegardées 5, Envoyées 4, …") — requires aggregate stats endpoint. Placeholder: render the stat cards with computed counts from the offers list (we already fetch `/api/jobs`), skip the funnel bars.
3. **Activity feed** on Dashboard ("Ledger a envoyé une offre…") — no activity log endpoint. Skip the widget entirely.
4. **Timeline/steps** on JobDetail (4-step interview process) — no steps field. Skip the timeline widget.
5. **"Améliorer avec Claude"** button on Profile — no endpoint. Skip.
6. **OAuth with Google/LinkedIn** on Login/Register — Supabase supports it but not wired today. Skip the oauth row.
7. **Profile nav sidebar** (Informations / À propos / Expériences …) — current Profile is a single-section form. Skip the left rail; keep the flat layout.

Each item gets a `TODO(paper-trail-v2):` comment at the spot where it would plug in so future work can find the insertion point.

---

## PHASE 0 — Scaffolding

### Task 1: Install fonts + base CSS wiring

**Goal:** Paper Trail global stylesheet loads, fonts render, body background shows warm parchment — nothing else changes yet.

**Files:**
- Create: `frontend/src/styles/paper-trail.css`
- Modify: `frontend/index.html`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1.1: Create the Paper Trail CSS (copy + adapt from mockup)**

Create `frontend/src/styles/paper-trail.css` with the full contents below. This is the authoritative design-system stylesheet — every token and utility the app will use.

```css
/* ══════════════════════════════════════════════════════════════
   PAPER TRAIL — Find-One Design System
   Single source of truth for tokens, layout, utilities.
   ══════════════════════════════════════════════════════════════ */

:root {
  /* Warm palette */
  --beige:       #E8D9B8;
  --beige-deep:  #D9C69C;
  --cream:       #EFE3C6;
  --warm-white:  #F3E9CF;
  --espresso:    #2C1A10;
  --brown-mid:   #6B4333;
  --terracotta:  #C05A38;
  --terracotta-l:#E8856A;
  --terracotta-d:#9E4528;
  --sage:        #6B8C72;
  --sage-l:      #A8C4AD;
  --sage-d:      #4A7052;
  --sand:        #D4B896;
  --sand-l:      #E8D6C0;
  --offer:       #E65100;
  --ink:         #3A2518;
  --ink-soft:    #6D5344;
  --ink-faint:   #9C8874;
  --shadow-warm: rgba(44, 26, 16, 0.08);
  --shadow-deep: rgba(44, 26, 16, 0.18);

  /* Radius + spacing */
  --radius-sm:   4px;
  --radius:      8px;
  --radius-lg:   12px;

  /* Fonts */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body:    'Lato', -apple-system, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root { height: 100%; }

body {
  font-family: var(--font-body);
  background: var(--cream);
  color: var(--espresso);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
}

a { color: var(--terracotta); text-decoration: none; }
a:hover { text-decoration: underline; }
button { font-family: inherit; cursor: pointer; }
input, textarea, select { font-family: inherit; font-size: 14px; }

/* ── LAYOUT ─────────────────────────────────────────────────── */
.app-shell { display: flex; min-height: 100vh; }

.main {
  flex: 1;
  overflow-y: auto;
  padding: 40px 48px;
  background: var(--warm-white);
}

/* ── SIDEBAR ────────────────────────────────────────────────── */
.sidebar {
  width: 240px;
  min-height: 100vh;
  background: var(--espresso);
  display: flex;
  flex-direction: column;
  padding: 32px 0;
  position: relative;
  flex-shrink: 0;
}
.sidebar::after {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 1px; height: 100%;
  background: linear-gradient(to bottom, transparent, var(--brown-mid), transparent);
  opacity: 0.4;
}
.logo-area {
  padding: 0 28px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.logo-mark {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--beige);
  letter-spacing: -0.5px;
  line-height: 1;
  text-decoration: none;
  display: block;
}
.logo-mark span { color: var(--terracotta-l); }
.logo-sub {
  font-size: 10px;
  font-weight: 300;
  color: var(--sand);
  letter-spacing: 2.5px;
  text-transform: uppercase;
  margin-top: 4px;
}

.nav { padding: 24px 0; flex: 1; }
.nav-section-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: rgba(212, 184, 150, 0.45);
  padding: 0 28px;
  margin-bottom: 8px;
  margin-top: 20px;
}
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 28px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 400;
  color: rgba(250, 247, 239, 0.6);
  position: relative;
  text-decoration: none;
}
.nav-item:hover {
  color: var(--beige);
  background: rgba(192, 90, 56, 0.1);
  text-decoration: none;
}
.nav-item.active {
  color: var(--beige);
  background: rgba(192, 90, 56, 0.15);
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0; top: 4px; bottom: 4px;
  width: 3px;
  background: var(--terracotta);
  border-radius: 0 2px 2px 0;
}
.nav-icon { width: 18px; height: 18px; opacity: 0.7; flex-shrink: 0; }
.nav-item.active .nav-icon,
.nav-item:hover .nav-icon { opacity: 1; }
.nav-badge {
  margin-left: auto;
  background: var(--terracotta);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
  line-height: 16px;
}
.sidebar-footer {
  padding: 16px 28px;
  border-top: 1px solid rgba(255,255,255,0.07);
  display: flex; align-items: center; gap: 12px;
  cursor: pointer;
  text-decoration: none;
}
.avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--terracotta), var(--brown-mid));
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display);
  font-size: 14px;
  color: white;
  font-weight: 600;
  flex-shrink: 0;
}
.user-info .name { font-size: 13px; font-weight: 700; color: var(--beige); }
.user-info .role { font-size: 10px; color: var(--sand); opacity: 0.6; }

/* ── PAGE HEADER ────────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 36px;
  gap: 24px;
}
.page-title {
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 600;
  color: var(--espresso);
  line-height: 1.1;
}
.page-title span {
  display: block;
  font-size: 14px;
  font-family: var(--font-body);
  font-weight: 300;
  color: var(--ink-soft);
  margin-top: 6px;
  letter-spacing: 0.3px;
}
.page-title em { color: var(--terracotta); font-style: italic; }
.eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--terracotta);
}
.eyebrow + .page-title { margin-top: 8px; }

/* ── BUTTONS ────────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  padding: 11px 20px;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  white-space: nowrap;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary {
  background: var(--terracotta);
  color: white;
  box-shadow: 0 4px 14px rgba(192, 90, 56, 0.3);
}
.btn-primary:hover:not(:disabled) {
  background: var(--terracotta-d);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(192, 90, 56, 0.4);
  text-decoration: none;
}
.btn-secondary {
  background: var(--beige);
  color: var(--espresso);
  border: 1px solid var(--sand-l);
}
.btn-secondary:hover:not(:disabled) { background: var(--beige-deep); text-decoration: none; }
.btn-ghost {
  background: transparent;
  color: var(--ink-soft);
  border: 1px solid var(--sand-l);
}
.btn-ghost:hover:not(:disabled) { background: var(--beige); color: var(--espresso); text-decoration: none; }
.btn-lg { padding: 14px 26px; font-size: 14px; }
.btn-sm { padding: 7px 14px; font-size: 12px; }

/* ── CARDS ──────────────────────────────────────────────────── */
.card {
  background: white;
  border: 1px solid var(--sand-l);
  border-radius: var(--radius-lg);
  padding: 22px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.section-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--espresso);
}
.section-link {
  font-size: 12px;
  color: var(--terracotta);
  font-weight: 700;
  letter-spacing: 0.3px;
}

/* ── FORMS ──────────────────────────────────────────────────── */
.field { margin-bottom: 18px; }
.label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--ink-soft);
  margin-bottom: 8px;
}
.input, .select, .textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--sand-l);
  border-radius: var(--radius-sm);
  background: white;
  color: var(--espresso);
  font-size: 14px;
  transition: all 0.2s;
  font-family: var(--font-body);
}
.input:focus, .select:focus, .textarea:focus {
  outline: none;
  border-color: var(--terracotta);
  box-shadow: 0 0 0 3px rgba(192, 90, 56, 0.12);
}
.input::placeholder, .textarea::placeholder { color: var(--ink-faint); }
.textarea { resize: vertical; min-height: 100px; line-height: 1.5; }
.field-hint {
  font-size: 11px;
  color: var(--ink-soft);
  opacity: 0.7;
  margin-top: 6px;
  font-style: italic;
  font-family: var(--font-display);
}
.field-error {
  font-size: 12px;
  color: var(--terracotta-d);
  margin-top: 6px;
  font-weight: 500;
}

/* ── BADGES ─────────────────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  white-space: nowrap;
  border: 1px solid transparent;
}
.badge-saved {
  background: var(--beige);
  color: var(--brown-mid);
  border-color: var(--sand-l);
}
.badge-applied {
  background: rgba(107, 140, 114, 0.15);
  color: var(--sage-d);
  border-color: rgba(107, 140, 114, 0.25);
}
.badge-interview {
  background: rgba(192, 90, 56, 0.12);
  color: var(--terracotta);
  border-color: rgba(192, 90, 56, 0.2);
}
.badge-pending {
  background: rgba(212, 184, 150, 0.3);
  color: var(--brown-mid);
  border-color: rgba(212, 184, 150, 0.5);
}
.badge-offer {
  background: #FFF3E0;
  color: var(--offer);
  border-color: #FFCC80;
}
.badge-rejected {
  background: rgba(158, 69, 40, 0.1);
  color: var(--terracotta-d);
  border-color: rgba(158, 69, 40, 0.2);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
  padding: 3px 9px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}
.tag-neutral  { background: var(--beige); color: var(--brown-mid); border: 1px solid var(--sand-l); }
.tag-location { background: var(--beige); color: var(--brown-mid); border: 1px solid var(--sand-l); }
.tag-type     { background: rgba(107, 140, 114, 0.12); color: var(--sage-d); border: 1px solid rgba(107, 140, 114, 0.2); }
.tag-salary   { background: rgba(192, 90, 56, 0.08); color: var(--terracotta); border: 1px solid rgba(192, 90, 56, 0.15); }

/* ── TABS ───────────────────────────────────────────────────── */
.filter-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: var(--beige);
  border: 1px solid var(--sand-l);
  padding: 4px;
  border-radius: var(--radius);
  width: fit-content;
}
.tab {
  padding: 7px 16px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--ink-soft);
  border: none;
  background: transparent;
  white-space: nowrap;
  font-family: var(--font-body);
}
.tab.active {
  background: white;
  color: var(--espresso);
  box-shadow: 0 2px 8px var(--shadow-warm);
}
.tab:hover:not(.active) { color: var(--espresso); }

/* ── JOB CARD ───────────────────────────────────────────────── */
.job-list { display: flex; flex-direction: column; gap: 14px; }
.job-card {
  background: white;
  border: 1px solid var(--sand-l);
  border-radius: var(--radius-lg);
  padding: 20px 22px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
}
.job-card::before {
  content: '';
  position: absolute;
  left: 0; top: 12px; bottom: 12px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  transition: opacity 0.2s;
  opacity: 0;
}
.job-card:hover {
  transform: translateX(2px);
  box-shadow: 0 6px 20px var(--shadow-warm);
  text-decoration: none;
}
.job-card:hover::before { opacity: 1; }
.job-card.saved::before     { background: var(--brown-mid); }
.job-card.applied::before   { background: var(--sage); }
.job-card.interview::before { background: var(--terracotta); }
.job-card.pending::before   { background: var(--sand); }
.job-card.offer::before     { background: var(--offer); }
.job-card.rejected::before  { background: var(--terracotta-d); }

.company-logo {
  width: 44px; height: 44px;
  border-radius: var(--radius);
  background: var(--beige);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  border: 1px solid var(--sand-l);
}
.job-info { flex: 1; min-width: 0; }
.job-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--espresso);
  margin-bottom: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.job-company {
  font-size: 13px;
  color: var(--ink-soft);
  margin-bottom: 10px;
}
.job-tags { display: flex; gap: 8px; flex-wrap: wrap; }
.job-status-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.job-date {
  font-size: 11px;
  color: var(--ink-soft);
  opacity: 0.5;
  font-style: italic;
  font-family: var(--font-display);
}

/* ── ICON BUTTON ────────────────────────────────────────────── */
.btn-icon {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--sand-l);
  color: var(--ink-soft);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}
.btn-icon:hover {
  background: var(--terracotta);
  color: white;
  border-color: var(--terracotta);
}
.btn-icon-sm { width: 28px; height: 28px; }

/* ── AUTH PAGES ─────────────────────────────────────────────── */
.auth-split {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  min-height: 100vh;
}
.auth-split.reversed { grid-template-columns: 1.1fr 1fr; }
.auth-brand {
  background: var(--espresso);
  color: var(--beige);
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}
.auth-brand::before {
  content: '';
  position: absolute;
  inset: -40%;
  background:
    radial-gradient(circle at 20% 30%, rgba(232,133,106,0.25), transparent 55%),
    radial-gradient(circle at 80% 70%, rgba(107,140,114,0.2), transparent 55%);
  pointer-events: none;
}
.auth-split.reversed .auth-brand::before {
  background:
    radial-gradient(circle at 80% 20%, rgba(232,133,106,0.25), transparent 55%),
    radial-gradient(circle at 10% 80%, rgba(212,184,150,0.15), transparent 55%);
}
.auth-brand > * { position: relative; z-index: 1; }
.brand-logo {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: var(--beige);
  letter-spacing: -0.5px;
  line-height: 1;
}
.brand-logo span { color: var(--terracotta-l); }
.brand-logo-sub {
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--sand);
  opacity: 0.7;
  margin-top: 6px;
}
.brand-footer {
  display: flex;
  gap: 20px;
  font-size: 11px;
  color: var(--sand);
  opacity: 0.6;
  letter-spacing: 0.5px;
}
.brand-footer a { color: var(--sand); }
.auth-form-side {
  background: var(--warm-white);
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.auth-form-inner {
  max-width: 420px;
  width: 100%;
  margin: 0 auto;
}
.auth-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--terracotta);
  margin-bottom: 12px;
}
.auth-title {
  font-family: var(--font-display);
  font-size: 42px;
  font-weight: 600;
  color: var(--espresso);
  line-height: 1.05;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}
.auth-title em { color: var(--terracotta); font-style: italic; }
.auth-sub {
  font-size: 14px;
  color: var(--ink-soft);
  margin-bottom: 32px;
  line-height: 1.55;
}
.auth-submit { width: 100%; justify-content: center; padding: 14px; margin-top: 8px; }
.auth-switch {
  margin-top: 28px;
  text-align: center;
  font-size: 13px;
  color: var(--ink-soft);
}
.auth-switch a { color: var(--terracotta); font-weight: 700; }

/* ── ANIMATIONS ─────────────────────────────────────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-up { animation: fadeUp 0.5s ease forwards; opacity: 0; }
.fade-up-1 { animation-delay: 0.05s; }
.fade-up-2 { animation-delay: 0.1s; }
.fade-up-3 { animation-delay: 0.15s; }
.fade-up-4 { animation-delay: 0.2s; }

/* ── UTILS ──────────────────────────────────────────────────── */
.stack { display: flex; flex-direction: column; }
.row   { display: flex; }
.center  { align-items: center; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }
```

- [ ] **Step 1.2: Add font links to `frontend/index.html`**

Replace the contents of `frontend/index.html` with:

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />
    <title>Find-One</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 1.3: Import Paper Trail CSS in `main.tsx`**

Open `frontend/src/main.tsx` and add the import at the very top (before React imports):

```tsx
import './styles/paper-trail.css'
import React from 'react'
// …existing imports below
```

- [ ] **Step 1.4: Run tests + lint + visual check**

```bash
cd frontend && npm run test:run && npm run lint
```

Expected: all tests pass, zero lint warnings.

Then `npm run dev` and open the app. Expected: fonts are now Playfair Display + Lato; background has a warm beige tint on pages not yet refactored. Pages look unfinished (old inline styles overlaid on new base) — this is expected; we fix page-by-page next.

- [ ] **Step 1.5: Run /simplify**

Invoke `/simplify` on the changes. Apply any findings.

- [ ] **Step 1.6: Commit**

```bash
git add frontend/src/styles/paper-trail.css frontend/index.html frontend/src/main.tsx
git commit -m "feat(frontend): scaffold Paper Trail design system (tokens, fonts, base CSS)"
```

---

## PHASE 1 — UI Primitives

Every primitive is a thin presentational wrapper over the classes already defined in `paper-trail.css`. No business logic. Props are typed so consumers can't pass arbitrary strings for variants.

### Task 2: Button primitive

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`

- [ ] **Step 2.1: Write the component**

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'sm' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', className = '', ...rest }, ref) => {
    const classes = [
      'btn',
      `btn-${variant}`,
      size === 'sm' && 'btn-sm',
      size === 'lg' && 'btn-lg',
      className,
    ]
      .filter(Boolean)
      .join(' ')
    return <button ref={ref} className={classes} {...rest} />
  }
)

Button.displayName = 'Button'
```

- [ ] **Step 2.2: Run tests + lint**

```bash
cd frontend && npm run test:run && npm run lint
```

Expected: green.

- [ ] **Step 2.3: Run /simplify, commit**

```bash
git add frontend/src/components/ui/Button.tsx
git commit -m "feat(frontend): add Paper Trail Button primitive"
```

---

### Task 3: Card primitive

**Files:**
- Create: `frontend/src/components/ui/Card.tsx`

- [ ] **Step 3.1: Write the component**

```tsx
import { HTMLAttributes } from 'react'

type Props = HTMLAttributes<HTMLDivElement>

export function Card({ className = '', ...rest }: Props) {
  return <div className={`card ${className}`.trim()} {...rest} />
}
```

- [ ] **Step 3.2: Run tests + lint, /simplify, commit**

```bash
cd frontend && npm run test:run && npm run lint
git add frontend/src/components/ui/Card.tsx
git commit -m "feat(frontend): add Paper Trail Card primitive"
```

---

### Task 4: Badge primitive (+ status helper)

**Files:**
- Create: `frontend/src/components/ui/Badge.tsx`

- [ ] **Step 4.1: Write the component**

```tsx
import { HTMLAttributes } from 'react'

export type BadgeVariant =
  | 'saved'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'pending'
  | 'rejected'

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant: BadgeVariant
  children: React.ReactNode
}

export function Badge({ variant, className = '', children, ...rest }: Props) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()} {...rest}>
      {children}
    </span>
  )
}
```

- [ ] **Step 4.2: Run tests + lint, /simplify, commit**

```bash
cd frontend && npm run test:run && npm run lint
git add frontend/src/components/ui/Badge.tsx
git commit -m "feat(frontend): add Paper Trail Badge primitive"
```

---

### Task 5: Form primitives — Input, Textarea, Select, Field, Label

**Files:**
- Create: `frontend/src/components/ui/Input.tsx`
- Create: `frontend/src/components/ui/Textarea.tsx`
- Create: `frontend/src/components/ui/Select.tsx`
- Create: `frontend/src/components/ui/Field.tsx`

- [ ] **Step 5.1: Input.tsx**

```tsx
import { InputHTMLAttributes, forwardRef } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className = '', ...rest }, ref) => (
    <input ref={ref} className={`input ${className}`.trim()} {...rest} />
  )
)
Input.displayName = 'Input'
```

- [ ] **Step 5.2: Textarea.tsx**

```tsx
import { TextareaHTMLAttributes, forwardRef } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ className = '', ...rest }, ref) => (
    <textarea ref={ref} className={`textarea ${className}`.trim()} {...rest} />
  )
)
Textarea.displayName = 'Textarea'
```

- [ ] **Step 5.3: Select.tsx**

```tsx
import { SelectHTMLAttributes, forwardRef } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ className = '', children, ...rest }, ref) => (
    <select ref={ref} className={`select ${className}`.trim()} {...rest}>
      {children}
    </select>
  )
)
Select.displayName = 'Select'
```

- [ ] **Step 5.4: Field.tsx (label + children + hint + error)**

```tsx
import { ReactNode } from 'react'

type Props = {
  label?: string
  hint?: string
  error?: string
  htmlFor?: string
  children: ReactNode
}

export function Field({ label, hint, error, htmlFor, children }: Props) {
  return (
    <div className="field">
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}
```

- [ ] **Step 5.5: Run tests + lint, /simplify, commit**

```bash
cd frontend && npm run test:run && npm run lint
git add frontend/src/components/ui/{Input,Textarea,Select,Field}.tsx
git commit -m "feat(frontend): add Paper Trail form primitives (Input, Textarea, Select, Field)"
```

---

### Task 6: FilterTabs primitive

**Files:**
- Create: `frontend/src/components/ui/FilterTabs.tsx`

- [ ] **Step 6.1: Write the component**

```tsx
type Tab<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  tabs: Tab<T>[]
  active: T
  onChange: (value: T) => void
}

export function FilterTabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div className="filter-tabs">
      {tabs.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`tab ${active === value ? 'active' : ''}`.trim()}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 6.2: Run tests + lint, /simplify, commit**

```bash
cd frontend && npm run test:run && npm run lint
git add frontend/src/components/ui/FilterTabs.tsx
git commit -m "feat(frontend): add Paper Trail FilterTabs primitive"
```

---

### Task 7: IconButton primitive

**Files:**
- Create: `frontend/src/components/ui/IconButton.tsx`

- [ ] **Step 7.1: Write the component**

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'md' | 'sm'
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(
  ({ size = 'md', className = '', children, ...rest }, ref) => {
    const cls = ['btn-icon', size === 'sm' && 'btn-icon-sm', className]
      .filter(Boolean)
      .join(' ')
    return (
      <button ref={ref} className={cls} {...rest}>
        {children}
      </button>
    )
  }
)
IconButton.displayName = 'IconButton'
```

- [ ] **Step 7.2: Run tests + lint, /simplify, commit**

```bash
cd frontend && npm run test:run && npm run lint
git add frontend/src/components/ui/IconButton.tsx
git commit -m "feat(frontend): add Paper Trail IconButton primitive"
```

---

### Task 8: Sidebar primitive (app navigation)

**Files:**
- Create: `frontend/src/components/ui/Sidebar.tsx`

- [ ] **Step 8.1: Write the component**

The Sidebar reads the current user from the auth store to render initials + email, and uses `<NavLink>` so React Router manages the `active` class.

```tsx
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const icons = {
  grid: (
    <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  search: (
    <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  stack: (
    <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12-1a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
    </svg>
  ),
  user: (
    <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
}

function initials(email?: string | null) {
  if (!email) return '?'
  const [local] = email.split('@')
  return local.slice(0, 2).toUpperCase()
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const email = user?.email ?? ''

  return (
    <aside className="sidebar">
      <div className="logo-area">
        <NavLink to="/" className="logo-mark">
          Find<span>·</span>One
        </NavLink>
        <div className="logo-sub">Tableau de bord</div>
      </div>

      <nav className="nav">
        <div className="nav-section-label">Principal</div>

        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {icons.grid}
          Tableau de bord
        </NavLink>

        <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {icons.search}
          Recherche d'offres
        </NavLink>

        <div className="nav-section-label">Documents</div>

        <NavLink to="/templates" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {icons.stack}
          Modèles & Documents
        </NavLink>

        <div className="nav-section-label">Compte</div>

        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {icons.user}
          Mon profil
        </NavLink>
      </nav>

      <NavLink to="/profile" className="sidebar-footer">
        <div className="avatar">{initials(email)}</div>
        <div className="user-info">
          <div className="name">{email || 'Non connecté'}</div>
          <div className="role">Chercheur d'emploi</div>
        </div>
      </NavLink>
    </aside>
  )
}
```

- [ ] **Step 8.2: Run tests + lint, /simplify, commit**

```bash
cd frontend && npm run test:run && npm run lint
git add frontend/src/components/ui/Sidebar.tsx
git commit -m "feat(frontend): add Paper Trail Sidebar primitive"
```

---

### Task 9: AppShell layout + route wiring

**Files:**
- Create: `frontend/src/components/ui/AppShell.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 9.1: Write AppShell**

```tsx
import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

type Props = { children: ReactNode }

export function AppShell({ children }: Props) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  )
}
```

- [ ] **Step 9.2: Wrap protected routes in App.tsx**

Open `frontend/src/App.tsx`. Find the `ProtectedRoute` component (or wherever the 5 protected routes are declared). Wrap the rendered page in `<AppShell>`:

```tsx
// BEFORE (simplified, actual file may differ slightly):
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const session = useAuthStore((s) => s.session)
  if (!session) return <Navigate to="/login" replace />
  return children
}

// AFTER:
import { AppShell } from './components/ui/AppShell'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const session = useAuthStore((s) => s.session)
  if (!session) return <Navigate to="/login" replace />
  return <AppShell>{children}</AppShell>
}
```

**Important:** `/login` and `/register` must NOT be inside `AppShell` — they use the `auth-split` layout directly. Verify that their `<Route>` elements are NOT wrapped in `ProtectedRoute`.

- [ ] **Step 9.3: Run tests + lint, visual check**

```bash
cd frontend && npm run test:run && npm run lint && npm run dev
```

Navigate to `http://localhost:5173/`. Expected: dark espresso sidebar on the left with the "Find · One" logo, nav items, and avatar at the bottom; the old dashboard content still renders on the right with its old inline-style look (we fix it later). No console errors.

- [ ] **Step 9.4: /simplify, commit**

```bash
git add frontend/src/components/ui/AppShell.tsx frontend/src/App.tsx
git commit -m "feat(frontend): wire Paper Trail AppShell into protected routes"
```

---

### Task 10: PageHeader primitive

**Files:**
- Create: `frontend/src/components/ui/PageHeader.tsx`

- [ ] **Step 10.1: Write the component**

```tsx
import { ReactNode } from 'react'

type Props = {
  eyebrow?: string
  title: ReactNode
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, subtitle, actions }: Props) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">
          {title}
          {subtitle && <span>{subtitle}</span>}
        </h1>
      </div>
      {actions && <div className="row gap-2 center">{actions}</div>}
    </div>
  )
}
```

- [ ] **Step 10.2: Run tests + lint, /simplify, commit**

```bash
cd frontend && npm run test:run && npm run lint
git add frontend/src/components/ui/PageHeader.tsx
git commit -m "feat(frontend): add Paper Trail PageHeader primitive"
```

---

## PHASE 2 — Page Refactors (simplest → hardest)

Each page refactor follows the same rhythm:
1. Rewrite the page JSX using primitives and Paper Trail classes.
2. Keep ALL hooks, state shape, handlers, and API calls exactly as they are.
3. Remove dependencies on `authStyles.ts` and inline `s` style objects from THIS page.
4. Run tests + lint + visual check.
5. `/simplify` + commit.

### Task 11: Login page

**Files:**
- Modify: `frontend/src/pages/Login.tsx`

**What to preserve (logic):**
- `useState` for `email`, `password`, `error`, `loading` (drop `focusedField` — the new CSS handles focus via `:focus`).
- `useNavigate`.
- `handleSubmit` that calls `useAuthStore.getState().login(email, password)` and navigates to `/` on success.

**What to drop:**
- All references to `authStyles` import.
- `focusedField` state.

- [ ] **Step 11.1: Rewrite Login.tsx**

Replace the file contents with:

```tsx
import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Field } from '../components/ui/Field'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await useAuthStore.getState().login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      <div className="auth-brand">
        <div>
          <div className="brand-logo">
            Find<span>·</span>One
          </div>
          <div className="brand-logo-sub">Votre parcours, votre récit</div>
        </div>

        <div style={{ maxWidth: 440 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 34,
              lineHeight: 1.25,
              color: 'var(--beige)',
              marginBottom: 24,
            }}
          >
            Chaque candidature est une{' '}
            <em style={{ color: 'var(--terracotta-l)' }}>page</em> du livre que
            vous êtes en train d'écrire.
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--sand)',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            <strong
              style={{
                color: 'var(--beige)',
                display: 'block',
                marginBottom: 4,
                textTransform: 'none',
                fontSize: 14,
              }}
            >
              Find-One
            </strong>
            Le compagnon de votre recherche d'emploi
          </div>
        </div>

        <div className="brand-footer">
          <span>© 2026 Find-One</span>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-inner">
          <div className="auth-eyebrow">Connexion</div>
          <h1 className="auth-title">
            Reprenons là où vous vous étiez <em>arrêté</em>.
          </h1>
          <p className="auth-sub">
            Connectez-vous pour retrouver vos candidatures, vos modèles et vos
            documents générés.
          </p>

          <form onSubmit={handleSubmit}>
            <Field label="Adresse e-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
              />
            </Field>

            <Field label="Mot de passe" htmlFor="password" error={error ?? undefined}>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <div className="auth-switch">
            Nouveau sur Find-One ? <Link to="/register">Créer un compte</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 11.2: Run tests + lint**

```bash
cd frontend && npm run test:run && npm run lint
```

Expected: green. If a test referenced `focusedField` or an `authStyles` selector, inspect: the test should still work because no existing test file reads inline styles or field focus state (per the survey).

- [ ] **Step 11.3: Visual check**

```bash
cd frontend && npm run dev
```

Visit `http://localhost:5173/login`. Compare with `design-proposals/paper-trail/login.html`. The two should look virtually identical: espresso left panel with quote, warm-white right panel with the form.

- [ ] **Step 11.4: /simplify**

- [ ] **Step 11.5: Commit**

```bash
git add frontend/src/pages/Login.tsx
git commit -m "feat(frontend): adapt Login to Paper Trail design"
```

---

### Task 12: Register page

**Files:**
- Modify: `frontend/src/pages/Register.tsx`

**What to preserve:**
- `useState` for `email`, `password`, `confirm`, `error`, `loading`.
- Password-mismatch derived check.
- `handleSubmit` that calls `useAuthStore.getState().register`.

**What to drop:**
- `focusedField` state.
- `authStyles` import.

- [ ] **Step 12.1: Rewrite Register.tsx**

```tsx
import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Field } from '../components/ui/Field'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const mismatch = confirm.length > 0 && password !== confirm

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (mismatch) return
    setError(null)
    setLoading(true)
    try {
      await useAuthStore.getState().register(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split reversed">
      <div className="auth-form-side">
        <div className="auth-form-inner">
          <div className="auth-eyebrow">Création de compte · gratuit</div>
          <h1 className="auth-title">
            Commencez votre <em>parcours</em>.
          </h1>
          <p className="auth-sub">
            Trois minutes pour créer votre compte. Ensuite, vos candidatures
            s'organisent toutes seules.
          </p>

          <form onSubmit={handleSubmit}>
            <Field label="Adresse e-mail" htmlFor="reg-email">
              <Input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
              />
            </Field>

            <Field
              label="Mot de passe"
              htmlFor="reg-password"
              hint="Au moins 8 caractères."
            >
              <Input
                id="reg-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Field
              label="Confirmer le mot de passe"
              htmlFor="reg-confirm"
              error={mismatch ? 'Les mots de passe ne correspondent pas.' : error ?? undefined}
            >
              <Input
                id="reg-confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              className="auth-submit"
              disabled={loading || mismatch}
            >
              {loading ? 'Création…' : 'Créer mon compte'}
            </Button>
          </form>

          <div className="auth-switch">
            Déjà un compte ? <Link to="/login">Se connecter</Link>
          </div>
        </div>
      </div>

      <div className="auth-brand">
        <div style={{ textAlign: 'right' }}>
          <div className="brand-logo">
            Find<span>·</span>One
          </div>
          <div className="brand-logo-sub">Votre parcours, votre récit</div>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 1.2,
              color: 'var(--beige)',
              marginBottom: 32,
              maxWidth: 400,
            }}
          >
            Ce qui vous attend <em style={{ color: 'var(--terracotta-l)', fontStyle: 'italic' }}>à l'intérieur</em>.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 400 }}>
            {[
              ['I.', 'Un tableau de bord clair', 'Chaque offre, chaque étape, chaque échange — rassemblés au même endroit.'],
              ['II.', 'Des CV & lettres sur mesure', 'Claude rédige une lettre adaptée à chaque offre à partir de votre profil.'],
              ['III.', 'Une recherche sans bruit', 'Les offres qui vous ressemblent, sans celles qui vous font perdre du temps.'],
            ].map(([num, title, body]) => (
              <div key={num} style={{ display: 'flex', gap: 16 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 28,
                    fontStyle: 'italic',
                    color: 'var(--terracotta-l)',
                    minWidth: 44,
                  }}
                >
                  {num}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 17,
                      color: 'var(--beige)',
                      marginBottom: 4,
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--sand)', lineHeight: 1.55 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="brand-footer" style={{ justifyContent: 'flex-end' }}>
          <span>© 2026</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 12.2: Tests + lint + visual check**

```bash
cd frontend && npm run test:run && npm run lint && npm run dev
```

Visit `/register`. Compare with `design-proposals/paper-trail/register.html`.

- [ ] **Step 12.3: /simplify + commit**

```bash
git add frontend/src/pages/Register.tsx
git commit -m "feat(frontend): adapt Register to Paper Trail design"
```

---

### Task 13: Profile page

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`

**What to preserve:**
- `useState` for `form`, `loading`, `saving`, `saved`, `error`.
- `useEffect` that calls `apiFetch('/api/profile')` on mount.
- `handleSave` that calls `PUT /api/profile` and toggles `saved` for 3 seconds.
- 4-language select (fr, en, es, de).

**What to drop:**
- Inline `s` style object; local keyframe animations (noted — `paper-trail.css` provides `fadeUp`).
- `focusedInput` state.

- [ ] **Step 13.1: Rewrite Profile.tsx**

```tsx
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { PageHeader } from '../components/ui/PageHeader'

type ProfileForm = {
  instructions: string
  language: 'fr' | 'en' | 'es' | 'de'
}

const EMPTY: ProfileForm = { instructions: '', language: 'fr' }

export default function Profile() {
  const [form, setForm] = useState<ProfileForm>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setForm({ instructions: data.instructions ?? '', language: data.language ?? 'fr' })
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Mon profil"
        title={
          <>
            Votre <em>identité</em>
          </>
        }
        subtitle="Le socle à partir duquel Claude rédige vos CV et lettres"
      />

      {loading && <Card>Chargement…</Card>}

      {!loading && (
        <Card>
          <Field
            label="Instructions personnelles pour Claude"
            htmlFor="instructions"
            hint="Ce texte guide chaque document généré : ton, points à mettre en avant, contraintes."
          >
            <Textarea
              id="instructions"
              rows={8}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="Ex. : développeur full-stack senior, 8 ans d'expérience, passionné par les produits B2B…"
            />
          </Field>

          <Field label="Langue des documents générés" htmlFor="language">
            <Select
              id="language"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value as ProfileForm['language'] })}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
            </Select>
          </Field>

          {error && <div className="field-error" style={{ marginBottom: 12 }}>{error}</div>}

          <div className="row gap-2 center" style={{ justifyContent: 'flex-end' }}>
            {saved && (
              <span style={{ fontSize: 13, color: 'var(--sage-d)' }}>✓ Enregistré</span>
            )}
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}
```

- [ ] **Step 13.2: Tests + lint + visual + /simplify + commit**

```bash
cd frontend && npm run test:run && npm run lint && npm run dev
# Visit /profile — verify it matches design-proposals/paper-trail/profile.html (simplified version, per out-of-scope notes)
```

```bash
git add frontend/src/pages/Profile.tsx
git commit -m "feat(frontend): adapt Profile to Paper Trail design"
```

---

### Task 14: Templates page

**Files:**
- Modify: `frontend/src/pages/Templates.tsx`

**What to preserve:**
- GET `/api/templates` on mount.
- POST `/api/templates` with `FormData` (file upload).
- DELETE `/api/templates/:id`.
- File-type badge (PDF / DOCX).
- Upload form (name, job type, file picker).

- [ ] **Step 14.1: Rewrite Templates.tsx**

```tsx
import { FormEvent, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'
import { IconButton } from '../components/ui/IconButton'

type Template = {
  id: string
  name: string
  job_type: string | null
  file_type: 'pdf' | 'docx'
  created_at: string
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadJobType, setUploadJobType] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const r = await apiFetch('/api/templates')
      setTemplates(await r.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file || !uploadName) return
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('name', uploadName)
    fd.append('job_type', uploadJobType)
    fd.append('file', file)
    try {
      await apiFetch('/api/templates', { method: 'POST', body: fd })
      setUploadName('')
      setUploadJobType('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload impossible')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce modèle ?')) return
    setDeletingId(id)
    try {
      await apiFetch(`/api/templates/${id}`, { method: 'DELETE' })
      setTemplates((ts) => ts.filter((t) => t.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Atelier"
        title="Modèles & Documents"
        subtitle="Vos modèles réutilisables pour générer CV et lettres"
      />

      {error && (
        <Card style={{ borderColor: 'var(--terracotta)', marginBottom: 20 }}>
          <div className="field-error">{error}</div>
        </Card>
      )}

      {/* Upload form */}
      <Card style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-title">Ajouter un modèle</div>
        </div>
        <form onSubmit={handleUpload}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Nom du modèle" htmlFor="tpl-name">
              <Input
                id="tpl-name"
                required
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="CV senior full-stack"
              />
            </Field>
            <Field label="Type de poste (optionnel)" htmlFor="tpl-job">
              <Input
                id="tpl-job"
                value={uploadJobType}
                onChange={(e) => setUploadJobType(e.target.value)}
                placeholder="Développeur"
              />
            </Field>
          </div>
          <Field label="Fichier (PDF ou DOCX)" htmlFor="tpl-file">
            <input
              id="tpl-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              required
              className="input"
              style={{ padding: 10 }}
            />
          </Field>
          <Button type="submit" variant="primary" disabled={uploading}>
            {uploading ? 'Envoi…' : 'Téléverser'}
          </Button>
        </form>
      </Card>

      {/* Templates list */}
      <div className="section-header">
        <div className="section-title">Vos modèles</div>
      </div>

      {loading && <Card>Chargement…</Card>}

      {!loading && templates.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: 20 }}>
            Aucun modèle pour l'instant. Téléversez votre premier CV ou lettre ci-dessus.
          </div>
        </Card>
      )}

      {!loading && templates.length > 0 && (
        <div className="stack gap-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <div className="row center gap-4">
                <div
                  className={`tag ${t.file_type === 'pdf' ? 'tag-salary' : 'tag-type'}`}
                  style={{ flexShrink: 0 }}
                >
                  {t.file_type.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {t.job_type || 'Type non spécifié'}
                  </div>
                </div>
                <IconButton
                  title="Supprimer"
                  aria-label="Supprimer le modèle"
                  onClick={() => handleDelete(t.id)}
                  disabled={deletingId === t.id}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                  </svg>
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 14.2: Tests + lint + visual + /simplify + commit**

```bash
cd frontend && npm run test:run && npm run lint && npm run dev
# Visit /templates — verify layout, upload works, delete works.
```

```bash
git add frontend/src/pages/Templates.tsx
git commit -m "feat(frontend): adapt Templates to Paper Trail design"
```

---

### Task 15: JobSearch page

**Files:**
- Modify: `frontend/src/pages/JobSearch.tsx`

**What to preserve:**
- Two-tab UX (`'search' | 'url'`).
- `GET /api/search/jobs?query=...` for keyword search.
- `POST /api/search/url` with `{ url }` for URL import.
- `<JobForm>` modal on result selection.
- `SearchResult` and `JobOffer` types from `lib/types`.

- [ ] **Step 15.1: Rewrite JobSearch.tsx**

```tsx
import { FormEvent, useState } from 'react'
import { apiFetch } from '../lib/api'
import { JobForm } from '../components/JobForm'
import type { SearchResult, JobOffer } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { FilterTabs } from '../components/ui/FilterTabs'
import { PageHeader } from '../components/ui/PageHeader'

type Tab = 'search' | 'url'

export default function JobSearch() {
  const [tab, setTab] = useState<Tab>('search')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)

  const [urlInput, setUrlInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [urlResult, setUrlResult] = useState<Partial<JobOffer> | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<JobOffer> | null>(null)

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    try {
      const r = await apiFetch(`/api/search/jobs?query=${encodeURIComponent(query)}`)
      setResults(await r.json())
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Recherche impossible')
    } finally {
      setSearching(false)
    }
  }

  async function handleImport(e: FormEvent) {
    e.preventDefault()
    if (!urlInput.trim()) return
    setImporting(true)
    setUrlError(null)
    setUrlResult(null)
    try {
      const r = await apiFetch('/api/search/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      })
      setUrlResult(await r.json())
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Impossible d'extraire l'offre")
    } finally {
      setImporting(false)
    }
  }

  function pickResult(r: SearchResult) {
    setFormData({
      title: r.title,
      company: r.company,
      url: r.url,
      location: r.location,
      salary: r.salary,
    })
  }

  function pickUrlResult() {
    if (urlResult) setFormData(urlResult)
  }

  return (
    <>
      <PageHeader
        eyebrow="Découverte"
        title={
          <>
            Trouvez <em>votre</em> prochaine aventure.
          </>
        }
        subtitle="Recherche par mots-clés ou import direct depuis une URL"
      />

      <FilterTabs<Tab>
        tabs={[
          { value: 'search', label: 'Rechercher' },
          { value: 'url', label: 'Importer une URL' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'search' && (
        <>
          <Card style={{ marginBottom: 20 }}>
            <form onSubmit={handleSearch}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Input
                    placeholder="Ex. : Développeur full-stack à Paris"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="primary" disabled={searching}>
                  {searching ? 'Recherche…' : 'Rechercher'}
                </Button>
              </div>
            </form>
          </Card>

          {searchError && <Card style={{ marginBottom: 16 }}><div className="field-error">{searchError}</div></Card>}

          <div className="stack gap-2">
            {results.map((r, i) => (
              <Card key={i}>
                <div className="row center gap-4">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
                      {r.company} · {r.location ?? '—'}
                      {r.salary ? ` · ${r.salary}` : ''}
                    </div>
                    {/* TODO(paper-trail-v2): match score when backend exposes it */}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => pickResult(r)}>
                    Ajouter
                  </Button>
                </div>
              </Card>
            ))}
            {!searching && results.length === 0 && !searchError && query && (
              <Card><div style={{ color: 'var(--ink-soft)' }}>Aucun résultat pour « {query} ».</div></Card>
            )}
          </div>
        </>
      )}

      {tab === 'url' && (
        <>
          <Card style={{ marginBottom: 20 }}>
            <form onSubmit={handleImport}>
              <Field label="URL de l'offre" htmlFor="url-input">
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://…"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </Field>
              <Button type="submit" variant="primary" disabled={importing}>
                {importing ? 'Extraction…' : 'Extraire'}
              </Button>
            </form>
          </Card>

          {urlError && <Card style={{ marginBottom: 16 }}><div className="field-error">{urlError}</div></Card>}

          {urlResult && (
            <Card>
              <div className="section-header">
                <div className="section-title">{urlResult.title ?? '(sans titre)'}</div>
                <Button size="sm" variant="primary" onClick={pickUrlResult}>Ajouter</Button>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {urlResult.company ?? '—'} · {urlResult.location ?? '—'}
              </div>
            </Card>
          )}
        </>
      )}

      {formData && (
        <JobForm
          initialData={formData as JobOffer}
          onSave={() => setFormData(null)}
          onClose={() => setFormData(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 15.2: Tests + lint + visual + /simplify + commit**

```bash
cd frontend && npm run test:run && npm run lint && npm run dev
# Visit /search — test both tabs, verify results render, modal opens.
```

```bash
git add frontend/src/pages/JobSearch.tsx
git commit -m "feat(frontend): adapt JobSearch to Paper Trail design"
```

---

### Task 16: JobDetail page

**Files:**
- Modify: `frontend/src/pages/JobDetail.tsx`

**What to preserve:**
- `useParams` → `id`.
- `useEffect` that calls `GET /api/jobs/:id` and `GET /api/templates`.
- `handleDelete` (uses `window.confirm` → `DELETE /api/jobs/:id` → `navigate('/')`).
- `<JobForm>` modal on `showEdit`.
- `<DocViewer>` embedded with `jobOfferId` + `templates`.

- [ ] **Step 16.1: Rewrite JobDetail.tsx**

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { JobForm } from '../components/JobForm'
import { DocViewer } from '../components/DocViewer'
import type { JobOffer, Template } from '../lib/types'
import { getStatusColor, STATUS_LABELS } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge, BadgeVariant } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'

function statusToVariant(status: JobOffer['status']): BadgeVariant {
  // Map backend status strings to Paper Trail badge variants.
  if (status === 'saved') return 'saved'
  if (status === 'applied') return 'applied'
  if (status === 'interviewing' || status === 'interview') return 'interview'
  if (status === 'offer') return 'offer'
  if (status === 'rejected') return 'rejected'
  return 'pending'
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [offer, setOffer] = useState<JobOffer | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      apiFetch(`/api/jobs/${id}`).then((r) => r.json()),
      apiFetch('/api/templates').then((r) => r.json()),
    ])
      .then(([o, t]) => {
        if (cancelled) return
        setOffer(o)
        setTemplates(t)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Chargement impossible'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleDelete() {
    if (!offer || !confirm('Supprimer cette candidature ?')) return
    setDeleting(true)
    try {
      await apiFetch(`/api/jobs/${offer.id}`, { method: 'DELETE' })
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible')
      setDeleting(false)
    }
  }

  if (loading) return <Card>Chargement…</Card>
  if (error) return <Card><div className="field-error">{error}</div></Card>
  if (!offer) return <Card>Offre introuvable.</Card>

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Link to="/" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          ← Retour au tableau de bord
        </Link>
      </div>

      <PageHeader
        eyebrow={offer.company}
        title={offer.title}
        subtitle={[offer.location, offer.contract_type, offer.salary].filter(Boolean).join(' · ')}
        actions={
          <>
            <Badge variant={statusToVariant(offer.status)}>
              {STATUS_LABELS[offer.status] ?? offer.status}
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => setShowEdit(true)}>
              Modifier
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <Card>
          <div className="section-header">
            <div className="section-title">Informations</div>
          </div>

          <div className="stack gap-2" style={{ fontSize: 13 }}>
            {offer.url && (
              <Row label="URL">
                <a href={offer.url} target="_blank" rel="noreferrer">
                  {offer.url}
                </a>
              </Row>
            )}
            {offer.recruiter_name && <Row label="Recruteur">{offer.recruiter_name}</Row>}
            {offer.applied_at && <Row label="Candidature envoyée">{offer.applied_at}</Row>}
            {offer.followup_date && <Row label="Relance prévue">{offer.followup_date}</Row>}
            {offer.interview_date && <Row label="Entretien">{offer.interview_date}</Row>}
          </div>

          {offer.notes && (
            <>
              <div className="section-header" style={{ marginTop: 24 }}>
                <div className="section-title">Notes</div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  background: 'var(--beige)',
                  padding: 16,
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--sand-l)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {offer.notes}
              </div>
            </>
          )}
        </Card>

        <Card
          style={{
            background: 'linear-gradient(135deg, var(--beige) 0%, var(--cream) 100%)',
            borderColor: 'var(--terracotta)',
          }}
        >
          <div className="section-title" style={{ fontSize: 18, marginBottom: 10 }}>
            Atelier Claude
          </div>
          <DocViewer jobOfferId={offer.id} templates={templates} />
        </Card>
      </div>

      {showEdit && (
        <JobForm
          initialData={offer}
          onSave={(updated) => {
            setOffer(updated)
            setShowEdit(false)
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row center" style={{ padding: '8px 0', borderBottom: '1px dashed var(--sand-l)' }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
          width: 160,
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}
```

**Note on `getStatusColor`:** we no longer need it on this page (Badge variant handles color), but leave the export in `lib/types.ts` alone — other code may use it.

- [ ] **Step 16.2: Tests + lint + visual + /simplify + commit**

```bash
cd frontend && npm run test:run && npm run lint && npm run dev
# Visit /jobs/:id for an existing offer — verify fields render, edit modal works, delete confirms.
```

```bash
git add frontend/src/pages/JobDetail.tsx
git commit -m "feat(frontend): adapt JobDetail to Paper Trail design"
```

---

### Task 17: Dashboard page + JobCardPT component

**Files:**
- Create: `frontend/src/components/JobCardPT.tsx`
- Modify: `frontend/src/pages/Dashboard.tsx`

**What to preserve:**
- `useEffect` → `GET /api/jobs`.
- `<JobForm>` modal on `showForm`.
- Click on a card navigates to `/jobs/:id`.

- [ ] **Step 17.1: Write JobCardPT.tsx**

```tsx
import { Link } from 'react-router-dom'
import type { JobOffer } from '../lib/types'
import { STATUS_LABELS } from '../lib/types'
import { Badge, BadgeVariant } from './ui/Badge'
import { StatusBadge } from './StatusBadge'

function statusToVariant(status: JobOffer['status']): BadgeVariant {
  if (status === 'saved') return 'saved'
  if (status === 'applied') return 'applied'
  if (status === 'interviewing' || status === 'interview') return 'interview'
  if (status === 'offer') return 'offer'
  if (status === 'rejected') return 'rejected'
  return 'pending'
}

function statusToCardClass(status: JobOffer['status']): string {
  if (status === 'saved') return 'saved'
  if (status === 'applied') return 'applied'
  if (status === 'interviewing' || status === 'interview') return 'interview'
  if (status === 'offer') return 'offer'
  if (status === 'rejected') return 'rejected'
  return 'pending'
}

export function JobCardPT({ offer }: { offer: JobOffer }) {
  const variant = statusToVariant(offer.status)
  const cardCls = statusToCardClass(offer.status)

  return (
    <Link to={`/jobs/${offer.id}`} className={`job-card ${cardCls}`}>
      <div className="company-logo">🏢</div>
      <div className="job-info">
        <div className="job-title">{offer.title}</div>
        <div className="job-company">
          {offer.company}
          {offer.location ? ` · ${offer.location}` : ''}
        </div>
        <div className="job-tags">
          {offer.contract_type && <span className="tag tag-type">{offer.contract_type}</span>}
          {offer.salary && <span className="tag tag-salary">{offer.salary}</span>}
        </div>
      </div>
      <div className="job-status-col">
        <Badge variant={variant}>{STATUS_LABELS[offer.status] ?? offer.status}</Badge>
        <StatusBadge
          status={offer.status}
          followup_date={offer.followup_date ?? null}
          interview_date={offer.interview_date ?? null}
        />
      </div>
    </Link>
  )
}
```

- [ ] **Step 17.2: Rewrite Dashboard.tsx**

```tsx
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { JobCardPT } from '../components/JobCardPT'
import { JobForm } from '../components/JobForm'
import type { JobOffer } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'

export default function Dashboard() {
  const [offers, setOffers] = useState<JobOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await apiFetch('/api/jobs')
      setOffers(await r.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // TODO(paper-trail-v2): aggregate stats widget, pipeline funnel, activity feed.
  const stats = {
    total: offers.length,
    interviews: offers.filter((o) => o.status === 'interviewing' || o.status === 'interview').length,
    offers: offers.filter((o) => o.status === 'offer').length,
  }

  return (
    <>
      <PageHeader
        title={
          <>
            Bonjour <em>Martin</em>
          </>
        }
        subtitle={`${stats.total} candidature${stats.total > 1 ? 's' : ''} en cours`}
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            + Ajouter une offre
          </Button>
        }
      />

      {/* Simple stat row — no funnel/activity yet (see out-of-scope notes) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Entretiens" value={stats.interviews} />
        <Stat label="Offres" value={stats.offers} />
      </div>

      <div className="section-header">
        <div className="section-title">Candidatures récentes</div>
      </div>

      {loading && <Card>Chargement…</Card>}
      {error && <Card><div className="field-error">{error}</div></Card>}

      {!loading && !error && offers.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-soft)' }}>
            Aucune candidature pour l'instant. Ajoutez votre première offre ou cherchez-en une via la
            recherche.
          </div>
        </Card>
      )}

      {!loading && !error && offers.length > 0 && (
        <div className="job-list">
          {offers.map((o) => (
            <JobCardPT key={o.id} offer={o} />
          ))}
        </div>
      )}

      {showForm && (
        <JobForm
          onSave={(newOffer) => {
            setOffers((prev) => [newOffer, ...prev])
            setShowForm(false)
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="card-warm">
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--espresso)', marginTop: 8 }}>
        {value}
      </div>
    </Card>
  )
}
```

- [ ] **Step 17.3: Tests + lint + visual + /simplify + commit**

```bash
cd frontend && npm run test:run && npm run lint && npm run dev
# Visit / — verify dashboard loads, stats row, job cards, +Add button opens modal.
```

```bash
git add frontend/src/pages/Dashboard.tsx frontend/src/components/JobCardPT.tsx
git commit -m "feat(frontend): adapt Dashboard to Paper Trail design"
```

---

## PHASE 3 — Cleanup

### Task 18: Remove dead files (authStyles.ts, old JobCard)

**Files:**
- Delete: `frontend/src/pages/authStyles.ts`
- Delete: `frontend/src/components/JobCard.tsx`

- [ ] **Step 18.1: Verify no consumers remain**

```bash
cd /home/mdoub/Github/Find-One
grep -rn "authStyles" frontend/src/
grep -rn "from.*JobCard[^P]" frontend/src/   # matches JobCard but not JobCardPT
```

Expected: both commands return no results. If either returns a hit, stop — that file still has a live consumer. Fix that first (update the consumer to use UI primitives or `JobCardPT`).

- [ ] **Step 18.2: Delete**

```bash
rm frontend/src/pages/authStyles.ts
rm frontend/src/components/JobCard.tsx
```

- [ ] **Step 18.3: Tests + lint**

```bash
cd frontend && npm run test:run && npm run lint
```

If `frontend/src/tests/JobCard.test.tsx` exists and imports the deleted `JobCard`, delete that test file too (it's obsolete — `JobCardPT` is the new component and its presentational behavior is verified visually, not unit-tested). Commit note: "Remove obsolete JobCard unit test — replaced by JobCardPT which is pure presentational; behavior covered by StatusBadge test."

Rerun tests to confirm green.

- [ ] **Step 18.4: /simplify + commit**

```bash
git add -A
git commit -m "chore(frontend): remove dead authStyles.ts and old JobCard after Paper Trail migration"
```

---

## Final Verification

- [ ] **Step F.1: Full test + lint + type-check**

```bash
cd frontend && npm run test:run && npm run lint && npm run build
```

All three must succeed. `npm run build` ensures TypeScript compiles cleanly (no lingering `any` from removed types, no unused imports).

- [ ] **Step F.2: Visual walkthrough**

```bash
cd frontend && npm run dev
```

Walk every route and compare against the corresponding mockup in `design-proposals/paper-trail/`:
- `/login` vs `login.html`
- `/register` vs `register.html`
- `/` vs `dashboard.html`
- `/search` vs `job-search.html`
- `/jobs/<id>` vs `job-detail.html`
- `/templates` vs `templates.html`
- `/profile` vs `profile.html`

Expected: espresso sidebar, warm-beige main canvas, Playfair Display headlines, terracotta accents, white cards. Remaining visual gaps correspond to the Out-of-Scope items noted at the top of this plan.

- [ ] **Step F.3: Announce completion**

The branch is now ready for PR review. Use `superpowers:finishing-a-development-branch` to structure the handoff (PR title, body, test plan).

---

## Self-Review

**Spec coverage:**
- ✅ Shared design system under `frontend/src/styles/paper-trail.css` + `frontend/src/components/ui/` — Tasks 1 + 2-10.
- ✅ Fonts via `index.html` — Task 1.
- ✅ Each of the 7 pages refactored with behavior preserved — Tasks 11-17.
- ✅ `/simplify` + `npm run test:run` + `npm run lint` after each — every task.
- ✅ Page order simplest→complex (Login→Register→Profile→Templates→JobSearch→JobDetail→Dashboard) — Tasks 11-17 in that exact order.
- ✅ One page per commit, message format `feat(frontend): adapt <PageName> to Paper Trail design` — each page task ends with the exact commit message.
- ✅ No API / auth / routing changes — constraints repeated in each page task's "What to preserve" section.
- ✅ Pre-commit hooks passing — handled by the test/lint gate before each commit.
- ✅ Out-of-scope items called out with `TODO(paper-trail-v2):` markers at insertion points.

**Placeholder scan:** searched the plan for `TBD`, `TODO(`, `implement later`, `fill in details`, "similar to Task N" — only legitimate occurrences are the `TODO(paper-trail-v2):` markers inside code snippets, which are intentional pointers for future work, not plan placeholders.

**Type consistency:**
- `BadgeVariant` declared in `Badge.tsx` (Task 4), reused in `JobDetail.tsx` (Task 16) and `JobCardPT.tsx` (Task 17) — consistent.
- `statusToVariant` helper declared twice (Tasks 16, 17) — duplication is intentional since each file uses slightly different consumer contexts; if a follow-up wants to DRY this, extract to `lib/types.ts`.
- Button/Card/Field/Input/Textarea/Select primitive APIs are stable across all consumer pages.
- `JobCardPT` coexists with `JobCard` only during Phase 2 and is deleted in Phase 3 — no permanent split.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-14-paper-trail-react-refactor.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, with spec-compliance review between tasks. Fastest iteration; you only intervene if a subagent escalates.

**2. Inline Execution** — I execute tasks in this session via `superpowers:executing-plans`, with checkpoints at the end of each phase for you to review.

Which approach?
