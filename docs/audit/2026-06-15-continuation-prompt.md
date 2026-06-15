# Prompt de continuation — Find-One (à coller dans une nouvelle conversation)

> Copie tout le bloc ci-dessous dans une nouvelle fenêtre Claude Code, à la racine du repo `Find-One`.

---

Tu reprends un travail de remédiation sur l'app **Find-One** en production (https://find-one-chi.vercel.app). Une première session a corrigé les bugs bloquants ; il reste les suivis, un **test fonctionnel exhaustif de toute l'app**, et la correction des bugs trouvés. Prends toutes les décisions toi-même et monitore tout du début à la fin. Réponds en français.

## Contexte déjà traité (NE PAS refaire)
- **BUG-1** : projet Supabase était en pause → réveillé, auth OK.
- **BUG-2** : le bundle prod appelait l'API sur `localhost`. Corrigé côté code via `frontend/src/lib/api.ts` → `resolveApiBase()` (fallback auto vers `${origin}/server` en prod). Vérifié E2E (`/server/api/jobs → 200`).
- **BUG-3** : route catch-all `*` + `frontend/src/pages/NotFound.tsx` ajoutées. Vérifié.
- **BUG-4** : helper `frontend/src/lib/authErrors.ts` (erreurs login différenciées), branché dans Login + Register. Vérifié.
- **BUG-6** : en-têtes de sécurité (CSP, X-Frame-Options…) dans `vercel.json`. Vérifié, 0 violation CSP.
- **BUG-7** : confirmation e-mail désactivée dans Supabase → l'inscription fonctionne (signup renvoie un token immédiatement).
- Livré via PR #48, mergé sur `main`, déployé. Rapport : `docs/audit/2026-06-15-prod-bug-report.md`. Plan : `docs/superpowers/plans/2026-06-15-prod-remediation.md`.

## Ce qu'il reste à faire (ta mission)

### A. Suivis de remédiation (code)
1. **Durcissement JWT** — `backend/app/services/auth.py` : ajouter `verify_aud` avec `audience="authenticated"` et épingler `issuer="https://rsffwwhhtomcuhkmmfyw.supabase.co/auth/v1"` dans les deux chemins de `pyjwt.decode` (asymétrique ES256/JWKS **et** HS256). Claims confirmés en prod : `alg=ES256`, `aud=authenticated`, `iss=https://rsffwwhhtomcuhkmmfyw.supabase.co/auth/v1`. Écris un test pytest dédié (`backend/tests/`) validant un token bien/mal formé, et teste E2E contre le backend déployé avec un vrai token (voir plus bas).
2. **Rate-limiting slowapi** — le limiter est défini dans `backend/app/main.py:14` mais **aucune route n'est décorée**. Ajouter `@limiter.limit(...)` (limites généreuses) sur les endpoints sensibles : `auth`, `documents/generate` (coût Claude), `search/jobs` (coût RapidAPI). Attention : derrière Vercel l'IP client arrive via `X-Forwarded-For` — vérifier que `get_remote_address` la résout, sinon tous les users tombent dans le même bucket. Valider après déploiement.
3. **Refactor `AuthBrand`** — le bloc sidebar `auth-brand` (logo + citation + footer) est dupliqué dans `Login.tsx`, `Register.tsx` et `NotFound.tsx`. Extraire un composant partagé `frontend/src/components/ui/AuthBrand.tsx` (paramétré par la citation/eyebrow) et déplacer les styles inline répétés vers `frontend/src/styles/paper-trail.css`. Invoque le skill `frontend-design` avant de toucher au frontend.
4. **Config Vercel (bloqué sur ton accès)** — `VITE_API_URL` côté Vercel vaut encore `http://localhost:9999` (le guard code le neutralise, donc non urgent), et `frontend_url` backend devrait valoir l'origine prod (CORS same-origin aujourd'hui, donc non urgent). Pour corriger proprement il faut l'accès Vercel via le MCP (`mcp__plugin_vercel_vercel__authenticate` → l'utilisateur doit autoriser l'OAuth dans son navigateur). Demande l'autorisation si tu veux le faire ; sinon documente-le.

### B. Test fonctionnel EXHAUSTIF + correction des bugs
Teste **chaque fonctionnalité** avec un compte de test, via l'API ET via le navigateur (browser-use), puis corrige les bugs trouvés. Surface API (toutes sous le préfixe `/server` en prod, protégées par JWT) :
- **Jobs** (`/api/jobs`) : `POST ""` (créer, 201), `GET ""` (lister), `GET /{id}`, `PUT /{id}`, `DELETE /{id}` (204).
- **Profile** (`/api/profile`) : `GET ""`, `PUT ""`.
- **Templates** (`/api/templates`) : `GET ""`, `POST ""` (upload PDF/DOCX, 201), `DELETE /{id}` (204).
- **Search** (`/api/search`) : `POST /url` (import depuis une URL d'offre), `GET /jobs` (recherche JSearch/RapidAPI — coûte des crédits).
- **Documents** (`/api/documents`) : `POST /generate` (génération CV/lettre en streaming via Claude — coûte des crédits Anthropic).
- **Auth** (`/auth/register`, `/auth/login`) : existent côté backend mais le frontend passe par Supabase directement.

Pages frontend à tester au navigateur : Login, Register, Dashboard (`/`), JobDetail (`/jobs/:id`), JobSearch (`/search`), Templates (`/templates`), Profile (`/profile`). Vérifie : CRUD complet, upload de fichiers, génération de documents, recherche, états vides, gestion d'erreurs, et l'absence d'appels `localhost` ou de violations CSP (la CSP limite `connect-src` à `'self'` + le domaine Supabase).

Pour les endpoints coûteux (search, documents/generate) : teste-les **une fois** chacun et note le coût ; s'ils échouent par clé API manquante/invalide, documente-le comme bug de config plutôt que de boucler.

### C. Livraison
Branche dédiée → PR vers `main` → attendre que **« Lint & Test » passe** (gate obligatoire ; « Security Scans » est informatif) → squash-merge → Vercel auto-déploie la prod → re-vérifier E2E. Applique `/simplify` avant chaque commit, `frontend-design` pour tout frontend, et lance la suite de tests + tsc + eslint localement avant de pousser.

## Accès & faits clés (gain de temps)
- **Compte de test prêt à l'emploi** (vérifié : login OK + backend `200`) — identifiants dans le `.env` racine (`TEST_USER_EMAIL` / `TEST_USER_PASSWORD`) :
  ```bash
  cd /home/mdoub/Github/Find-One && set -a && source .env && set +a
  TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
  # curl -H "Authorization: Bearer $TOKEN" https://find-one-chi.vercel.app/server/api/jobs
  ```
- **Ou** crée un compte neuf à la volée (la confirmation e-mail est désactivée) :
  ```bash
  cd /home/mdoub/Github/Find-One && set -a && source .env && set +a
  EMAIL="findone-qa-$(date +%s)@example.com"; PW="TestPass123!"
  TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/signup" -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
  # puis : curl -H "Authorization: Bearer $TOKEN" https://find-one-chi.vercel.app/server/api/jobs
  ```
  Un compte `findone-ci@test.local` (id `8e35e0ee-2062-4a2b-8b39-3dbfbf952920`) existe aussi mais son mot de passe est inconnu.
- **Backend** : déployé sur le même projet Vercel sous `/server` (`/server/health` → 200, `/server/docs` → Swagger). `api/index.py` importe `backend/app/main.py`.
- **`.env` racine** (gitignoré) : contient `SUPABASE_URL/ANON_KEY/SERVICE_KEY/JWT_SECRET`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `JSEARCH_API_KEY`. ⚠️ La `SUPABASE_SERVICE_KEY` locale est **invalide** (l'API admin renvoie `403 not_admin`) — n'utilise pas l'API admin ; passe par signup public.
- **Vercel** : pas de CLI ni de token local ; le MCP exige une autorisation OAuth de l'utilisateur. Le déploiement prod se fait par **merge sur `main`** (auto-deploy), pas besoin de CLI.
- **git/gh** : authentifié comme `Setounkpe7`, remote SSH, branche par défaut `main`, branche de travail courante `dev`. Pre-commit hooks actifs (TruffleHog, pytest, vitest) — ils tournent au commit.
- **browser-use** : prêt (`browser-use open/state/eval/...`). ⚠️ Les indices d'éléments changent entre les chargements — relis toujours `state` avant `input`/`click`. Les `Input` sont en **shadow DOM** : `document.body.innerText` ne les voit pas, utilise `state` (qui traverse le shadow).
- **Tests** : frontend Vitest dans `frontend/src/tests/` (jsdom, mocke `../lib/supabase`) ; backend pytest avec SQLite en mémoire et `get_current_user` overridé.

## Règles de travail (CLAUDE.md — non négociables)
Tâche complexe → plan via `superpowers` d'abord. Frontend → skill `frontend-design`. Avant commit de code → `/simplify`. Browser → `browser-use` CLI (pas curl pour les assertions UI). Scripts/CLI → teste le happy path en vrai. Docs utilisateur (`.md`) → `/humanizer` (sauf plans/specs/runbooks). Vérifie tes affirmations (tests/commande réelle) avant de dire « fait ».

Commence par établir un plan, puis exécute de bout en bout.
