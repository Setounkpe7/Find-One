# Plan de remédiation production — Find-One

- **Date** : 2026-06-15
- **Rapport source** : [docs/audit/2026-06-15-prod-bug-report.md](../../audit/2026-06-15-prod-bug-report.md)
- **Contributeurs** : agents DevOps, Frontend, Sécurité
- **Statut** : prêt à exécuter (aucune modification appliquée — plan uniquement)

## Objectif

Remettre l'application en service et corriger les défauts d'UX, de robustesse et de sécurité identifiés. La panne est due à deux mauvaises configurations Vercel, pas à un bug de code. Le code applicatif fonctionne (le backend FastAPI répond déjà sur `/server`).

## Ordre d'exécution

1. **PHASE 1 — Rétablir le service** (BUG-1, BUG-2) : recréer Supabase, recâbler les variables d'env Vercel, rebuild. C'est ce qui remet l'app en ligne.
2. **PHASE 2 — Robustesse frontend** (BUG-3, BUG-4) : route 404 + gestion d'erreurs de login. PR de code.
3. **PHASE 3 — Durcissement** (BUG-5, BUG-6 + trouvailles connexes) : CORS, en-têtes de sécurité, rate-limiting, validation JWT. Même PR ou PR suivante.

---

## PHASE 1 — Rétablir le service (CRITIQUE)

> Les variables `VITE_*` sont injectées au **build**. Toute correction de `VITE_*` exige un **rebuild/redéploiement** sans cache — pas seulement un changement de valeur dans le dashboard.

### Étape 1.1 — Recréer le projet Supabase (HUMAIN)
1. Créer un nouveau projet Supabase, région proche de la région des fonctions Vercel.
2. Récupérer (Settings → API) : `Project URL`, clé `anon`, clé `service_role`, et (JWT Settings) le `JWT Secret`.
3. Récupérer la connexion Postgres (Settings → Database) : utiliser la chaîne **poolée** (port 6543, mode transaction/PgBouncer) + `?sslmode=require` pour le runtime serverless. Garder la chaîne **directe** (5432) pour les migrations DDL.
4. Recréer le(s) bucket(s) Storage attendus par `services/storage.py` (même nom, même visibilité public/privé).
5. Auth → URL Configuration : `Site URL = https://find-one-chi.vercel.app` + redirections autorisées. Activer le provider Email (+ OAuth si utilisé auparavant).

> **Données** : l'ancienne base est perdue (DNS mort). Repartir d'un schéma neuf, sauf si un dump existe ailleurs.

### Étape 1.2 — Appliquer les migrations Alembic (AUTOMATISABLE)
Depuis `backend/`, avec la chaîne **directe** :
```bash
cd backend
export DATABASE_URL='postgresql://...directe...:5432/postgres?sslmode=require'
alembic current        # attendu : vide
alembic upgrade head
alembic current        # attendu : id de révision head
```
Vérifier la présence des tables `job_offers`, `user_profiles`, `templates`, `generated_documents`.

### Étape 1.3 — Reconfigurer TOUTES les variables Vercel (AUTOMATISABLE)
Projet Vercel unique (frontend + backend partagent le projet). Supprimer les anciennes valeurs avant d'ajouter (`vercel env rm ... production`).

**Frontend (build-time, `VITE_*`, publiques) :**

| Variable | Valeur |
|----------|--------|
| `VITE_API_URL` | `https://find-one-chi.vercel.app/server` (sans slash final) |
| `VITE_SUPABASE_URL` | URL du nouveau projet |
| `VITE_SUPABASE_ANON_KEY` | nouvelle clé `anon` (publique) |

**Backend (runtime, SECRÈTES — jamais en `VITE_`) :**

| Variable | Valeur |
|----------|--------|
| `database_url` | chaîne **poolée** + `?sslmode=require` |
| `supabase_url` | identique à `VITE_SUPABASE_URL` |
| `supabase_anon_key` | identique à `VITE_SUPABASE_ANON_KEY` |
| `supabase_service_key` | clé `service_role` (SECRÈTE) |
| `supabase_jwt_secret` | JWT secret (SECRÈTE) |
| `anthropic_api_key` | clé Claude |
| `jsearch_api_key` | clé RapidAPI JSearch |
| `frontend_url` | `https://find-one-chi.vercel.app` (corrige BUG-5) |

> `supabase_url`/`VITE_SUPABASE_URL` et `supabase_anon_key`/`VITE_SUPABASE_ANON_KEY` **doivent être identiques** sous peine de 403 sur chaque appel API (mismatch JWKS/issuer). Noms en minuscules obligatoires (pydantic-settings).

### Étape 1.4 — Rebuild/redéploiement sans cache (AUTOMATISABLE)
```bash
vercel --prod
```
Si redéploiement via dashboard : **décocher « Use existing build cache »**, sinon l'ancien bundle `localhost:9999` est réutilisé.

### Étape 1.5 — Vérification par couche
```bash
# Backend vivant (sans auth)
curl -s -w '%{http_code}\n' https://find-one-chi.vercel.app/server/health   # 200 {"status":"ok"}
curl -s -o /dev/null -w '%{http_code}\n' https://find-one-chi.vercel.app/server/api/jobs  # 403
# Le bundle ne pointe plus vers localhost
uvx browser-use --session findone open https://find-one-chi.vercel.app/login
uvx browser-use --session findone eval 'JSON.stringify(performance.getEntriesByType("resource").map(r=>r.name).filter(n=>n.includes("localhost")))'  # []
```
**Test E2E (preuve réelle)** : se connecter (utilisateur test créé dans Supabase), vérifier la clé `sb-<ref>-auth-token` dans `localStorage`, charger le dashboard sans « Failed to fetch », et confirmer un `GET …/server/api/jobs → 200`. Décoder le JWT : `iss` doit être `https://<ref>.supabase.co/auth/v1`.

### Découpage humain / automatisable
- **HUMAIN** : créer le projet Supabase, fournir les clés secrètes (Anthropic, JSearch), config dashboard (auth, Storage, Site URL), saisir le mot de passe test une fois dans la session headed.
- **AUTOMATISABLE** : migrations Alembic, `vercel env add`, rebuild, sondes de vérification.

### Décision d'hébergement
Garder le backend sur Vercel sous `/server` pour l'instant : ça marche, c'est prouvé, et le same-origin élimine CORS. **À surveiller** : timeouts sur la génération de documents en streaming (`doc_generator.py`) et erreurs « too many connections ». Si l'un apparaît, déplacer le backend vers un hôte long-running (Fly.io / Railway / Render) et basculer `VITE_API_URL` + `frontend_url` (CORS devient alors critique).

---

## PHASE 2 — Robustesse frontend (ÉLEVÉ)

### BUG-3 — Route catch-all 404
- **`frontend/src/App.tsx`** : importer `NotFound` et ajouter en **dernière** route : `<Route path="*" element={<NotFound />} />`.
- **Nouveau `frontend/src/pages/NotFound.tsx`** : page **hors `AppShell`** (comme `Login`/`Register`) — un visiteur non authentifié ne doit pas voir la nav authentifiée. Réutilise les classes existantes (`auth-split`, `auth-eyebrow`, `auth-title`, composant `Button`), copie FR, lien « Retour à l'accueil » vers `/` (la logique `ProtectedRoute` route ensuite vers dashboard ou `/login`). Contenu complet fourni par l'agent Frontend.
- **Refactor utile** : extraire `<Routes>` dans un composant `AppRoutes` exporté pour tester le routage sans `BrowserRouter` + effet `loadSession`.

### BUG-4 — Gestion d'erreurs de login différenciée
- **`frontend/src/pages/Login.tsx`** : remplacer `catch { setError('Identifiants invalides') }` par un mapper `loginErrorMessage(err)` (exporté, testable) :
  - `TypeError` (« Failed to fetch ») → « Service momentanément indisponible… »
  - `AuthError` `invalid_credentials` / status 400 → « Identifiants invalides »
  - `email_not_confirmed` → message de confirmation e-mail
  - status 429 → message rate-limit ; status ≥ 500 → indisponible
  - fallback générique (jamais « identifiants invalides »)
  - utiliser `isAuthError` de `@supabase/supabase-js`.
- **`frontend/src/pages/Register.tsx`** : n'a pas le bug, mais affiche le message Supabase brut (anglais) → factoriser un helper partagé `frontend/src/lib/authErrors.ts` utilisé par les deux pages (même PR, suivi mineur).

### Tests (Vitest, dans `frontend/src/tests/`)
- `loginErrorMessage.test.ts` : table de cas (TypeError, AuthError 400/email_not_confirmed/429/503, fallback).
- `Login.test.tsx` : rendu + chaque forme d'erreur ; **assertion de non-régression** : un `TypeError` n'affiche PAS « Identifiants invalides » ; succès → `navigate('/')`.
- `App.routing.test.tsx` : `/zzz-nope` et `/dashboard` rendent la 404 ; une route connue n'est pas masquée par le catch-all.

---

## PHASE 3 — Durcissement (MOYEN / FAIBLE + trouvailles connexes)

### BUG-6 — En-têtes de sécurité (dans `vercel.json`, pas FastAPI)
Le SPA et l'API sont same-origin ; les en-têtes navigateur protègent le document HTML → les poser à l'edge couvre tout. Ajouter un bloc `headers` sur `source: "/(.*)"` : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, et une CSP de départ. **`connect-src` doit inclure le nouveau domaine Supabase** (`https://<ref>.supabase.co` + `wss://` si Realtime) ; `'self'` couvre `/server`. `style-src 'unsafe-inline'` requis par Vite ; ne **jamais** mettre `'unsafe-inline'` dans `script-src`. Retirer l'ancien ref `rsffwwhhtomcuhkmmfyw`.

### BUG-5 — CORS backend
`frontend_url` réglé à l'origine prod exacte (fait en 1.3). Pas de wildcard avec `allow_credentials=True`. Lister explicitement les origines de preview si nécessaire.

### Hygiène des secrets (CRITIQUE lors de la recréation Supabase)
- **Seules** la clé `anon` et l'URL projet peuvent porter le préfixe `VITE_`. `service_role`, `jwt_secret`, `database_url` en `VITE_` = **faille critique** (clé exposée dans le bundle client : bypass RLS / forge de tokens).
- Vérifier après build : `grep -r "<12 1ers car. de la service key>" frontend/dist/` → doit être vide. `git grep -i 'service_role\|jwt_secret'` → vide. `frontend/.env` reste gitignoré.

### Trouvailles connexes (suivi, PR suivante)
- **slowapi inerte** : le limiter est branché dans `main.py` mais aucune route n'est décorée. Ajouter `@limiter.limit(...)` sur auth/login, génération de documents (coût Claude) et recherche (coût RapidAPI). Vérifier la résolution d'IP via `X-Forwarded-For` derrière Vercel.
- **JWT (`services/auth.py`)** : activer `verify_aud` (`audience="authenticated"`) et épingler `issuer=f"{supabase_url}/auth/v1"` (pertinent car projet recréé — empêche le rejeu d'un token d'un autre projet). Privilégier le chemin asymétrique ES256/JWKS pour éviter de détenir le secret HS256.
- Ajouter le grep anti-secret du bundle en CI.

---

## Statut d'implémentation (branche `fix/prod-remediation-2026-06-15`)

**Livré (code, testé, prêt à déployer) :**
- **BUG-1** : résolu hors-code par le réveil du projet Supabase (auth de nouveau fonctionnelle).
- **BUG-2** : corrigé **côté code** plutôt que par la variable Vercel (accès Vercel non disponible en autonomie). `frontend/src/lib/api.ts` expose `resolveApiBase()` : en contexte déployé, une `VITE_API_URL` absente ou pointant vers localhost est ignorée au profit de `${origin}/server`. `DocViewer.tsx` consomme `API_BASE` partagé. Auto-réparant et indépendant de la config Vercel.
- **BUG-3** : route `*` + `frontend/src/pages/NotFound.tsx` (hors AppShell, style éditorial cohérent).
- **BUG-4** : `frontend/src/lib/authErrors.ts` partagé, branché dans `Login.tsx` et `Register.tsx`.
- **BUG-6** : en-têtes (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) dans `vercel.json`.
- **Tests** : `authErrors.test.ts`, `api.test.ts`, `NotFound.test.tsx` (suite : 39 verts, tsc + eslint OK).

**Suivis (non livrés — nécessitent une action humaine ou une vérification impossible en autonomie) :**
- **BUG-7** : désactiver « Confirm email » ou configurer un SMTP (dashboard Supabase). Bloque l'inscription.
- **BUG-2 (option propre)** : corriger aussi `VITE_API_URL` côté Vercel (le fallback code rend ce point non bloquant).
- **BUG-5** : `frontend_url` côté backend Vercel.
- **Durcissement JWT** (`verify_aud`, `issuer`) : **volontairement non livré** — auth-critique et non testable E2E sans JWT valide (clé service locale invalide, SMTP cassé). À faire avec un compte test une fois BUG-7 réglé.
- **slowapi** : décorateurs `@limiter.limit` — non livré (réglage IP derrière Vercel à valider, risque de throttle global).

## Critères d'acceptation

- [ ] Connexion et inscription fonctionnent en prod (E2E navigateur OK).
- [ ] `GET /server/api/jobs` authentifié → 200 ; le bundle ne référence plus `localhost`.
- [ ] URL inconnue → page 404 (plus d'écran blanc).
- [ ] Échec réseau au login → message « indisponible », pas « identifiants invalides ».
- [ ] En-têtes CSP/X-Frame-Options présents ; aucun secret backend dans `frontend/dist/`.
- [ ] Tests Vitest verts ; pipeline CI au vert.
