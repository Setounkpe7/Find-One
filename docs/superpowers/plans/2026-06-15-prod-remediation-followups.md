# Find-One — Suivis de remédiation prod (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Durcir le JWT, activer le rate-limiting, dédupliquer le panneau de marque auth, puis tester toute l'app de bout en bout et corriger les bugs trouvés.

**Architecture:** Backend FastAPI (durcissement `validate_supabase_jwt`, limiter slowapi extrait dans `app/limiter.py` pour éviter l'import circulaire, décorateurs sur les endpoints coûteux). Frontend React (composant partagé `AuthBrand` + styles déplacés vers `paper-trail.css`). Tests : pytest (backend) + vitest (frontend). Livraison : branche → PR vers `dev` → PR `dev` → `main`.

**Tech Stack:** FastAPI, PyJWT, slowapi, React 18 + Vite, TypeScript, Vitest, pytest.

**Base branch:** `dev` (déjà synchronisé sur `main` au début de la session). Branche de travail : `fix/remediation-followups`.

---

## File Structure

- `backend/app/services/auth.py` — **Modify** : verify_aud + issuer pinning sur les 2 chemins decode.
- `backend/app/limiter.py` — **Create** : `get_client_ip` (X-Forwarded-For aware) + instance `limiter`.
- `backend/app/main.py` — **Modify** : importer `limiter` depuis `app.limiter` au lieu de le définir.
- `backend/app/api/auth.py` — **Modify** : `@limiter.limit` sur register/login + param `request: Request`.
- `backend/app/api/documents.py` — **Modify** : `@limiter.limit` sur generate + param `request`.
- `backend/app/api/search.py` — **Modify** : `@limiter.limit` sur `/url` et `/jobs` + param `request`.
- `backend/tests/test_auth_hardening.py` — **Create** : tests aud/iss/exp/sub sur tokens HS256 réels.
- `backend/tests/test_limiter.py` — **Create** : test unitaire `get_client_ip` (XFF) + non-régression endpoint décoré.
- `frontend/src/components/ui/AuthBrand.tsx` — **Create** : shell `AuthBrand` + `AuthBrandStatement`.
- `frontend/src/styles/paper-trail.css` — **Modify** : classes `.brand-statement`, `.brand-eyebrow-block`, `.brand-feature*`.
- `frontend/src/pages/Login.tsx` — **Modify** : utiliser `AuthBrand`/`AuthBrandStatement`.
- `frontend/src/pages/Register.tsx` — **Modify** : utiliser `AuthBrand` (align right) + liste feature.
- `frontend/src/pages/NotFound.tsx` — **Modify** : utiliser `AuthBrand`/`AuthBrandStatement`.
- `frontend/src/tests/AuthBrand.test.tsx` — **Create** : rend logo + footer + contenu.

---

## Task 1 — Durcissement JWT (verify_aud + issuer)

**Files:**
- Modify: `backend/app/services/auth.py`
- Test: `backend/tests/test_auth_hardening.py`

- [ ] **Step 1: Écrire les tests qui échouent**

`backend/tests/test_auth_hardening.py` :

```python
import time
import jwt as pyjwt
import pytest
import app.services.auth as auth_mod
from app.services.auth import validate_supabase_jwt

SECRET = "test-jwt-secret"
URL = "https://proj.supabase.co"
ISS = f"{URL}/auth/v1"


@pytest.fixture(autouse=True)
def _pin_settings(monkeypatch):
    monkeypatch.setattr(auth_mod.settings, "supabase_jwt_secret", SECRET)
    monkeypatch.setattr(auth_mod.settings, "supabase_url", URL)


def _token(**overrides):
    claims = {
        "sub": "user-123",
        "email": "user@example.com",
        "aud": "authenticated",
        "iss": ISS,
        "exp": int(time.time()) + 3600,
    }
    claims.update(overrides)
    return pyjwt.encode(claims, SECRET, algorithm="HS256")


def test_valid_token_passes():
    result = validate_supabase_jwt(_token())
    assert result == {"user_id": "user-123", "email": "user@example.com"}


def test_wrong_audience_rejected():
    with pytest.raises(ValueError):
        validate_supabase_jwt(_token(aud="anon"))


def test_wrong_issuer_rejected():
    with pytest.raises(ValueError):
        validate_supabase_jwt(_token(iss="https://evil.example.com/auth/v1"))


def test_expired_token_rejected():
    with pytest.raises(ValueError):
        validate_supabase_jwt(_token(exp=int(time.time()) - 10))


def test_missing_sub_rejected():
    with pytest.raises(ValueError):
        validate_supabase_jwt(_token(sub=None))
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `cd backend && python -m pytest tests/test_auth_hardening.py -v`
Expected: `test_wrong_audience_rejected` et `test_wrong_issuer_rejected` ÉCHOUENT (aujourd'hui `verify_aud=False`, pas de check iss).

- [ ] **Step 3: Implémenter le durcissement**

Dans `backend/app/services/auth.py`, ajouter un helper et passer `audience`/`issuer` aux deux `decode` :

```python
def _expected_issuer() -> str:
    return f"{settings.supabase_url.rstrip('/')}/auth/v1"
```

Remplacer le bloc asymétrique :

```python
        if alg in _ASYMMETRIC_ALGS:
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token).key
            payload = pyjwt.decode(
                token,
                signing_key,
                algorithms=[alg],
                audience="authenticated",
                issuer=_expected_issuer(),
            )
        else:
            payload = pyjwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                issuer=_expected_issuer(),
            )
```

(pyjwt vérifie `aud`/`iss` dès que `audience`/`issuer` sont fournis ; `InvalidAudienceError`/`InvalidIssuerError`/`ExpiredSignatureError` héritent de `InvalidTokenError`, déjà capturé → `ValueError`.)

- [ ] **Step 4: Lancer les tests — doivent passer**

Run: `cd backend && python -m pytest tests/test_auth_hardening.py tests/test_auth.py -v`
Expected: PASS (les anciens tests `test_auth.py` mockent `pyjwt.decode`, donc inchangés).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/auth.py backend/tests/test_auth_hardening.py
git commit -m "fix(auth): pin JWT audience and issuer on both decode paths"
```

---

## Task 2 — Rate-limiting slowapi (X-Forwarded-For aware)

**Files:**
- Create: `backend/app/limiter.py`
- Modify: `backend/app/main.py`, `backend/app/api/auth.py`, `backend/app/api/documents.py`, `backend/app/api/search.py`
- Test: `backend/tests/test_limiter.py`

- [ ] **Step 1: Écrire le test qui échoue**

`backend/tests/test_limiter.py` :

```python
from types import SimpleNamespace
from app.limiter import get_client_ip


def _req(headers, client_host="10.0.0.1"):
    return SimpleNamespace(
        headers=headers,
        client=SimpleNamespace(host=client_host),
    )


def test_uses_first_xff_ip_behind_proxy():
    req = _req({"x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178"})
    assert get_client_ip(req) == "203.0.113.7"


def test_falls_back_to_client_host_without_xff():
    req = _req({})
    assert get_client_ip(req) == "10.0.0.1"
```

- [ ] **Step 2: Lancer — échec attendu**

Run: `cd backend && python -m pytest tests/test_limiter.py -v`
Expected: FAIL (`ModuleNotFoundError: app.limiter`).

- [ ] **Step 3: Créer `backend/app/limiter.py`**

```python
from starlette.requests import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def get_client_ip(request: Request) -> str:
    """Resolve the real client IP behind Vercel's proxy.

    Vercel forwards the original client in X-Forwarded-For (comma-separated,
    client first). Without this, request.client.host is Vercel's internal IP
    and every user would share a single rate-limit bucket.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    return get_remote_address(request)


limiter = Limiter(key_func=get_client_ip)
```

- [ ] **Step 4: `backend/app/main.py` — importer le limiter partagé**

Remplacer les lignes :

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
...
limiter = Limiter(key_func=get_remote_address)
```

par :

```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
...
# (supprimer la ligne `limiter = Limiter(...)`)
```

`app.state.limiter = limiter` et le handler d'exception restent inchangés.

- [ ] **Step 5: Décorer les endpoints sensibles**

`backend/app/api/auth.py` — ajouter imports et décorateurs :

```python
from fastapi import APIRouter, HTTPException, Request
from app.limiter import limiter
...
@router.post("/register", response_model=TokenResponse)
@limiter.limit("20/minute")
def register(request: Request, body: RegisterRequest):
    ...

@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
def login(request: Request, body: LoginRequest):
    ...
```

`backend/app/api/documents.py` :

```python
from fastapi import APIRouter, Depends, HTTPException, Request
from app.limiter import limiter
...
@router.post("/generate")
@limiter.limit("30/hour")
async def generate_document(
    request: Request,
    body: GenerateDocRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    ...
```

`backend/app/api/search.py` :

```python
from fastapi import APIRouter, Depends, Query, Request
from app.limiter import limiter
...
@router.post("/url")
@limiter.limit("60/hour")
def import_from_url(request: Request, body: UrlImportRequest, user: dict = Depends(get_current_user)):
    ...

@router.get("/jobs")
@limiter.limit("60/hour")
def search(
    request: Request,
    query: str = Query(..., min_length=2),
    page: int = Query(1, ge=1),
    user: dict = Depends(get_current_user),
):
    ...
```

(slowapi exige le paramètre nommé `request: Request` ; le placer en premier.)

- [ ] **Step 6: Non-régression — la suite backend complète passe**

Run: `cd backend && python -m pytest -q`
Expected: PASS (limites généreuses, jamais atteintes par les tests ; les endpoints décorés répondent normalement via TestClient qui fournit `request`).

- [ ] **Step 7: Commit**

```bash
git add backend/app/limiter.py backend/app/main.py backend/app/api/auth.py backend/app/api/documents.py backend/app/api/search.py backend/tests/test_limiter.py
git commit -m "feat(api): rate-limit auth/documents/search with X-Forwarded-For key"
```

---

## Task 3 — Refactor `AuthBrand` (DRY + styles vers CSS)

> Invoquer le skill `frontend-design` AVANT d'écrire/éditer le frontend (règle CLAUDE.md). Les valeurs exactes (tailles, couleurs via variables CSS existantes) sont reprises telles quelles depuis les inline styles actuels.

**Files:**
- Create: `frontend/src/components/ui/AuthBrand.tsx`
- Modify: `frontend/src/styles/paper-trail.css`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/Register.tsx`, `frontend/src/pages/NotFound.tsx`
- Test: `frontend/src/tests/AuthBrand.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

`frontend/src/tests/AuthBrand.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AuthBrand, AuthBrandStatement } from '../components/ui/AuthBrand'

describe('AuthBrand', () => {
  it('renders the logo, footer and child content', () => {
    render(
      <AuthBrand footer="© 2026 Find-One">
        <AuthBrandStatement
          quote={<span>Une page</span>}
          eyebrowTitle="Find-One"
          eyebrowSub="Le compagnon"
        />
      </AuthBrand>,
    )
    expect(screen.getByText(/Find/)).toBeInTheDocument()
    expect(screen.getByText('© 2026 Find-One')).toBeInTheDocument()
    expect(screen.getByText('Une page')).toBeInTheDocument()
    expect(screen.getByText('Le compagnon')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Lancer — échec attendu**

Run: `cd frontend && npx vitest run src/tests/AuthBrand.test.tsx`
Expected: FAIL (module `AuthBrand` introuvable).

- [ ] **Step 3: Créer `frontend/src/components/ui/AuthBrand.tsx`**

```tsx
import { ReactNode } from 'react'

interface AuthBrandProps {
  children: ReactNode
  align?: 'left' | 'right'
  footer?: ReactNode
}

export function AuthBrand({ children, align = 'left', footer = '© 2026 Find-One' }: AuthBrandProps) {
  const right = align === 'right'
  return (
    <div className="auth-brand">
      <div style={right ? { textAlign: 'right' } : undefined}>
        <div className="brand-logo">
          Find<span>·</span>One
        </div>
        <div className="brand-logo-sub">Votre parcours, votre récit</div>
      </div>

      {children}

      <div className="brand-footer" style={right ? { justifyContent: 'flex-end' } : undefined}>
        <span>{footer}</span>
      </div>
    </div>
  )
}

interface AuthBrandStatementProps {
  quote: ReactNode
  eyebrowTitle: string
  eyebrowSub: string
}

export function AuthBrandStatement({ quote, eyebrowTitle, eyebrowSub }: AuthBrandStatementProps) {
  return (
    <div className="brand-statement-block">
      <div className="brand-statement">{quote}</div>
      <div className="brand-eyebrow-block">
        <strong>{eyebrowTitle}</strong>
        {eyebrowSub}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Ajouter les classes dans `frontend/src/styles/paper-trail.css`**

Après le bloc `.brand-footer` (≈ ligne 583), ajouter — reprend exactement les inline styles actuels :

```css
.brand-statement-block { max-width: 440px; }
.brand-statement {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 34px;
  line-height: 1.25;
  color: var(--beige);
  margin-bottom: 24px;
}
.brand-statement em { color: var(--terracotta-l); }
.brand-eyebrow-block {
  font-size: 12px;
  color: var(--sand);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.brand-eyebrow-block strong {
  color: var(--beige);
  display: block;
  margin-bottom: 4px;
  text-transform: none;
  font-size: 14px;
}
```

- [ ] **Step 5: Câbler `Login.tsx`**

Remplacer tout le bloc `<div className="auth-brand">…</div>` par :

```tsx
import { AuthBrand, AuthBrandStatement } from '../components/ui/AuthBrand'
...
      <AuthBrand>
        <AuthBrandStatement
          quote={
            <>
              Chaque candidature est une <em>page</em> du livre que vous êtes en
              train d'écrire.
            </>
          }
          eyebrowTitle="Find-One"
          eyebrowSub="Le compagnon de votre recherche d'emploi"
        />
      </AuthBrand>
```

- [ ] **Step 6: Câbler `NotFound.tsx`**

Remplacer le bloc `<div className="auth-brand">…</div>` par :

```tsx
import { AuthBrand, AuthBrandStatement } from '../components/ui/AuthBrand'
...
      <AuthBrand>
        <AuthBrandStatement
          quote={<>Cette <em>page</em> ne figure pas dans votre récit.</>}
          eyebrowTitle="Erreur 404"
          eyebrowSub="Page introuvable"
        />
      </AuthBrand>
```

- [ ] **Step 7: Câbler `Register.tsx` (align right + liste feature conservée)**

Remplacer le bloc `<div className="auth-brand">…</div>` par `<AuthBrand align="right" footer="© 2026">…</AuthBrand>` en gardant la liste de features `I./II./III.` comme children. Déplacer aussi les styles inline de cette liste vers des classes `.brand-feature*` dans `paper-trail.css` (mêmes valeurs).

- [ ] **Step 8: Lancer les tests + typecheck + lint**

Run:
```bash
cd frontend && npx vitest run src/tests/AuthBrand.test.tsx && npx tsc --noEmit && npx eslint src/components/ui/AuthBrand.tsx src/pages/Login.tsx src/pages/Register.tsx src/pages/NotFound.tsx
```
Expected: PASS / 0 erreur.

- [ ] **Step 9: `/simplify` puis commit**

```bash
git add frontend/src/components/ui/AuthBrand.tsx frontend/src/styles/paper-trail.css frontend/src/pages/Login.tsx frontend/src/pages/Register.tsx frontend/src/pages/NotFound.tsx frontend/src/tests/AuthBrand.test.tsx
git commit -m "refactor(auth-ui): extract shared AuthBrand component, move inline styles to CSS"
```

---

## Task 4 — Test fonctionnel EXHAUSTIF (API + navigateur)

> Objectif : produire une liste de bugs. Ne corrige rien ici — documente.

- [ ] **Step 1: Récupérer un token de test** (voir le prompt de continuation §Accès)

```bash
cd /home/mdoub/Github/Find-One && set -a && source .env && set +a
TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
echo "${TOKEN:0:20}…"
```

- [ ] **Step 2: Tester chaque endpoint API** (base `https://find-one-chi.vercel.app/server`)
  - Jobs : `POST /api/jobs` (201) → `GET /api/jobs` → `GET /api/jobs/{id}` → `PUT /api/jobs/{id}` → `DELETE /api/jobs/{id}` (204).
  - Profile : `GET /api/profile`, `PUT /api/profile`.
  - Templates : `GET /api/templates`, `POST /api/templates` (upload PDF/DOCX, 201), `DELETE /api/templates/{id}` (204).
  - Search : `POST /api/search/url`, `GET /api/search/jobs?query=…` (1 seule fois — coûte des crédits RapidAPI).
  - Documents : `POST /api/documents/generate` (1 seule fois — coûte des crédits Anthropic ; flux SSE).
  - Pour chaque : noter status + forme de réponse. Endpoint coûteux en échec par clé manquante → bug de **config**, pas de boucle.

- [ ] **Step 3: Tester les pages au navigateur** via `browser-use` (skill/CLI, pas curl)
  - Login, Register, Dashboard (`/`), JobDetail (`/jobs/:id`), JobSearch (`/search`), Templates (`/templates`), Profile (`/profile`).
  - Vérifier : CRUD complet, upload fichier, génération doc, recherche, états vides, gestion d'erreurs.
  - Vérifier l'absence d'appels `localhost` et de violations CSP (console).

- [ ] **Step 4: Consigner les bugs** dans `docs/audit/2026-06-15-functional-test-report.md` (sévérité, repro, cause probable, surface).

---

## Task 5 — Corriger les bugs trouvés

- [ ] Pour chaque bug bloquant/majeur : reproduire, écrire un test qui échoue (TDD), corriger, re-tester. Bugs de config Vercel non corrigeables sans accès → documenter dans le rapport et signaler à l'utilisateur.
- [ ] `/simplify` avant chaque commit ; un commit par bug avec message conventionnel.

---

## Task 6 — Livraison

- [ ] **Step 1: Gates locaux**

```bash
cd backend && python -m pytest -q && flake8 app && mypy app
cd ../frontend && npx vitest run && npx tsc --noEmit && npx eslint .
```
Expected: tout vert.

- [ ] **Step 2: Push branche + PR vers `dev`**

```bash
git push -u origin fix/remediation-followups
gh pr create --base dev --title "Suivis remédiation : JWT, rate-limit, AuthBrand + corrections" --body "<résumé>"
```

- [ ] **Step 3: Merge dans `dev`** (après revue) — le push sur `dev` met à jour automatiquement la PR `dev` → `main` (`auto-create-pr.yml`).

- [ ] **Step 4: PR `dev` → `main`** — attendre que **« Lint & Test » passe** (gate obligatoire ; « Security Scans » informatif), puis squash-merge.

- [ ] **Step 5: Re-vérifier la prod E2E** après auto-deploy Vercel (token réel → endpoints 200, pages OK, 0 violation CSP).

---

## Self-Review

- **Couverture spec** : A1 JWT → Task 1 ; A2 rate-limit → Task 2 ; A3 AuthBrand → Task 3 ; A4 config Vercel → documenté (Task 5, bloqué accès) ; B test exhaustif → Task 4 ; corrections → Task 5 ; C livraison → Task 6. ✔
- **Placeholders** : aucun — chaque step montre le code/commande. ✔
- **Cohérence types** : `get_client_ip` (limiter.py + test), `AuthBrand`/`AuthBrandStatement` (composant + usages + test) — noms identiques partout. ✔
- **Import circulaire** : évité via `app/limiter.py` (main + routers l'importent). ✔
