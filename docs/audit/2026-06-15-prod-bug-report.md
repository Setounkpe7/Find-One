# Rapport d'audit production — Find-One

- **URL testée** : https://find-one-chi.vercel.app/login
- **Date** : 2026-06-15
- **Méthode** : tests navigateur (browser-use), inspection du bundle déployé, sondage des endpoints, lecture du code source
- **Commit déployé (HEAD local)** : `1860bb4`

## Verdict

L'application est **totalement inutilisable en production**. Aucun utilisateur ne peut se connecter ni s'inscrire. La cause est une mauvaise configuration des variables d'environnement sur Vercel, pas un bug de code applicatif. Deux blocages critiques de configuration, plus deux défauts d'UX/robustesse qui existent indépendamment.

---

## BUG-1 (CRITIQUE) — Projet Supabase mort : authentification impossible

- **Symptôme** : sur `/login`, toute tentative de connexion échoue. La page affiche « Identifiants invalides ».
- **Réseau observé** : `POST https://rsffwwhhtomcuhkmmfyw.supabase.co/auth/v1/token` → `TypeError: Failed to fetch`.
- **Cause racine** : le domaine `rsffwwhhtomcuhkmmfyw.supabase.co` **ne résout pas en DNS** (`HTTP 000`, `DNS FAIL` côté serveur, y compris `/auth/v1/health`). Le projet Supabase référencé par `VITE_SUPABASE_URL` a été supprimé ou n'existe plus.
- **Impact** : toutes les routes applicatives sont protégées (`ProtectedRoute`). Sans auth, **l'application entière est hors service**.
- **Conséquence en cascade** : `DATABASE_URL` du backend pointe très probablement vers le Postgres de ce **même** projet Supabase → la base de données et les données utilisateurs sont également perdues.
- **Preuve** :
  - Bundle prod `index-DzYO0P35.js` contient `https://rsffwwhhtomcuhkmmfyw.supabase.co`.
  - `frontend/src/lib/supabase.ts` lève une erreur si `VITE_SUPABASE_URL` manque ⇒ la variable est bien définie, mais vers un projet mort.

## BUG-2 (CRITIQUE) — `VITE_API_URL` pointe vers localhost en production

- **Symptôme** : tous les appels au backend (jobs, profil, recherche, templates, génération de documents) échoueraient même après rétablissement de l'auth.
- **Cause racine** : le bundle prod contient `Ay="http://localhost:9999"` comme base d'API. La variable `VITE_API_URL` configurée sur Vercel vaut `http://localhost:9999` (valeur de dev, jamais corrigée).
- **Valeur attendue** : `https://find-one-chi.vercel.app/server`.
- **Le backend est pourtant déployé et sain** sur le même projet Vercel (défini dans `vercel.json`, préfixe `/server`) :
  - `GET /server/health` → `200 {"status":"ok"}`
  - `GET /server/docs` → `200` (Swagger « Find-One API »)
  - `GET /server/api/jobs` → `403` (auth requise — comportement correct)
- **Preuve** : `frontend/src/lib/api.ts:3` construit `${API_BASE}${path}`. Avec la bonne valeur, `/api/jobs` devient `/server/api/jobs` (même origine, pas de CORS).
- **Note** : le défaut du code source est `http://localhost:8000` mais le bundle contient `9999` ⇒ une variable Vercel **erronée** a bien été injectée au build (ce n'est pas une variable manquante).

## BUG-3 (ÉLEVÉ) — Aucune route 404 : page blanche sur URL inconnue

- **Symptôme** : visiter `/dashboard` ou toute URL inconnue (`/zzz-nope`) rend une **page entièrement blanche** (`document.body` vide).
- **Cause racine** : `frontend/src/App.tsx` ne déclare aucune route catch-all `path="*"`. React Router ne rend rien.
- **Aggravant** : le tableau de bord est servi sur `/` (et non `/dashboard`), donc une URL « naturelle » comme `/dashboard` tombe sur l'écran blanc.
- **Bon point** : `/` redirige correctement vers `/login` quand l'utilisateur n'est pas authentifié (le `finally` de `loadSession` débloque bien `initialized`).

## BUG-4 (ÉLEVÉ) — Le login masque toutes les erreurs en « Identifiants invalides »

- **Symptôme** : un échec réseau, une panne serveur ou un rate-limit s'affichent comme « Identifiants invalides ».
- **Cause racine** : `frontend/src/pages/Login.tsx:22-23` → `catch { setError('Identifiants invalides') }` capture **toutes** les exceptions sans distinguer le type.
- **Impact** : un utilisateur avec les bons identifiants pendant une panne (cf. BUG-1) croit que son mot de passe est faux. Diagnostic et support rendus difficiles.

## BUG-7 (ÉLEVÉ) — Inscription cassée : envoi d'e-mail de confirmation en échec

- **Symptôme** : `POST /auth/v1/signup` renvoie `500 {"error_code":"unexpected_failure","msg":"Error sending confirmation email"}`. Aucun nouveau compte ne peut être créé.
- **Cause racine** : la confirmation e-mail est activée sur le projet Supabase, mais l'envoi SMTP échoue (SMTP par défaut Supabase rate-limité/non configuré, ou SMTP custom invalide).
- **Découvert** après le réveil de Supabase (donc indépendant de BUG-1).
- **Impact** : acquisition d'utilisateurs bloquée. Les comptes existants peuvent toujours se connecter.
- **Correctif (dashboard Supabase, HUMAIN)** : Authentication → Providers → Email → désactiver « Confirm email », **ou** configurer un SMTP fonctionnel (Resend, SendGrid…). Côté code, BUG-4 garantit déjà un message FR propre au lieu de l'erreur brute.

## BUG-5 (MOYEN, latent) — CORS backend limité à localhost

- `backend/app/main.py:21` → `allow_origins=[settings.frontend_url]`, défaut `http://localhost:5173`.
- Non bloquant aujourd'hui (le frontend appelle `/server` en **même origine**), mais devient bloquant si `VITE_API_URL` pointe un jour vers un autre domaine. `FRONTEND_URL` doit être défini sur le backend en prod.

## BUG-6 (FAIBLE, durcissement) — En-têtes de sécurité manquants

- Réponse prod : pas de `Content-Security-Policy` ni `X-Frame-Options`. `Strict-Transport-Security` est bien présent.

---

## Tableau de synthèse

| ID | Sévérité | Domaine | Correction principale |
|----|----------|---------|------------------------|
| BUG-1 | Critique | Infra/Supabase | Recréer le projet Supabase + recâbler `VITE_SUPABASE_URL/ANON_KEY` et les env backend |
| BUG-2 | Critique | Config Vercel | `VITE_API_URL=https://find-one-chi.vercel.app/server` + rebuild |
| BUG-3 | Élevé | Frontend | Ajouter route `*` + page 404 |
| BUG-4 | Élevé | Frontend | Différencier les erreurs de login |
| BUG-7 | Élevé | Infra/Supabase | Désactiver la confirmation e-mail ou configurer un SMTP |
| BUG-5 | Moyen | Backend | Définir `FRONTEND_URL` en prod |
| BUG-6 | Faible | Sécurité | Ajouter CSP / X-Frame-Options |
