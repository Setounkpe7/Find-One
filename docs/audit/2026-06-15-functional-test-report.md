# Find-One — Rapport de test fonctionnel exhaustif (prod)

**Date :** 2026-06-15
**Cible :** https://find-one-chi.vercel.app (backend sous `/server`)
**Méthode :** balayage API au curl avec un vrai JWT Supabase (compte QA `findone-qa-…@example.com`, `sub f1576cb3-e5a4-44e4-bb7b-e8710d329f44`) + parcours navigateur (browser-use, login Supabase réel).

## Résultats par surface

| Surface | Endpoint / page | Résultat | Statut |
|---|---|---|---|
| Health | `GET /server/health` | 200 `{"status":"ok"}` | ✅ |
| Auth (négatif) | `GET /api/jobs` sans token | 403 `Not authenticated` | ✅ |
| Jobs | `POST` 201, `GET` liste 200, `GET /{id}` 200, `PUT` 200, `GET` bogus 404, `DELETE` 204 | conforme | ✅ |
| Profile | `GET` 200, `PUT` 200 | conforme | ✅ |
| Templates | `GET` 200 `[]` | conforme | ✅ |
| Templates | `POST` (upload docx) | **500** | ❌ BUG-B |
| Templates | `POST` (.txt invalide) | 400 (validation OK) | ✅ |
| Search | `POST /api/search/url` | 200 (scrape OK) | ✅ |
| Search | `GET /api/search/jobs?query=developer` | **500** | ❌ BUG-A |
| Documents | `POST /api/documents/generate` (SSE) | 200, stream Claude (lettre FR générée) | ✅ |
| Validation | champ manquant / champ en trop | 422 | ✅ |
| Front | Login → Dashboard | redirection OK, vrai nom utilisateur, état vide propre | ✅ |
| Front | Profile, Templates, Search | rendent correctement | ✅ |
| Front | appels `localhost` / `:9999` | aucun (fix BUG-2 confirmé) | ✅ |
| Front | violations CSP | aucune observée | ✅ |

**Coûts engagés** (1 appel chacun, conformément à la consigne) : 1 génération Claude (documents/generate, OK), 1 appel JSearch/RapidAPI (search/jobs, a échoué côté code).

## Bugs

### BUG-A — `GET /api/search/jobs` renvoie 500 (code)
**Cause :** `backend/app/services/jsearch.py`. Le bloc réseau est protégé par try/except, mais la construction des résultats se fait **après** :
```python
"location": item.get("job_city", "") + ", " + item.get("job_country", ""),
...
"description": item.get("job_description", "")[:500],
```
Quand l'API JSearch renvoie un item où `job_city`/`job_country`/`job_description` valent `None` (clé présente, valeur nulle), `None + ", "` lève `TypeError` **hors** du try → 500 non capturé.
**Reproduit localement :** `search_jobs("developer", 1)` → `TypeError: unsupported operand type(s) for +: 'NoneType' and 'str'`.
**Visible utilisateur :** la page Recherche affiche « API error 500: ».
**Sévérité :** majeure (fonctionnalité de recherche d'offres totalement cassée). **Correction : code.**

### BUG-B — `POST /api/templates` renvoie 500 (config/infra + code)
**Deux causes cumulées :**
1. **Bucket Storage manquant (config/infra).** `upload_file` (Supabase Storage, bucket `templates`) lève `StorageException: Bucket not found`. Le bucket `templates` n'existe pas dans le projet Supabase. La clé service est bien acceptée pour le Storage (erreur métier, pas 403). Non capturé → 500.
2. **Écart de design storage ↔ parse (code).** `upload_file` retourne une **clé d'objet Storage** (`{uuid}_{nom}.docx`), mais `parse_template` ouvre son argument comme un **chemin de fichier local** (`pdfplumber.open` / `python-docx Document()`). À la génération de document, `_find_best_template` appelle `parse_template(tmpl.file_path, …)` sur la clé d'objet → fichier introuvable. Conséquence : même bucket créé, un template uploadé ne pourrait jamais être relu. Le code ne télécharge jamais l'objet depuis le Storage.
**Visible utilisateur :** l'upload de modèle échoue (500 brut). La génération sans template fonctionne (le template est optionnel), donc l'écart #2 est aujourd'hui latent.
**Sévérité :** majeure (fonctionnalité Modèles totalement cassée). **Correction : code (round-trip + gestion d'erreur) + provisionnement du bucket.**

## Notes mineures (non bloquantes)
- Auth sans header renvoie 403 (et non 401) — comportement par défaut de `HTTPBearer` FastAPI, acceptable.
- Messages d'erreur front génériques (« API error 500: ») — UX perfectible mais hors périmètre immédiat.
