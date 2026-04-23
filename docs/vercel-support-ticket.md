# Vercel Support Ticket — Python version pin ignored, builder forces CPython 3.14.3

## TL;DR

On project `prj_jfPthIoTNh59WgD68sjqLerC92ha` (find-one), the Python builder
always uses **CPython 3.14.3**, regardless of which of the three documented
pinning mechanisms (`pyproject.toml`, `.python-version`, `Pipfile.lock`) is
used — at the repo root or alongside the function in `api/`. Our deps have no
`cp314` wheels so every build fails on `psycopg2-binary==2.9.10` →
`pg_config not found`.

The docs state Python **3.12** is the default; our project disagrees.

## Project

- **Project ID:** `prj_jfPthIoTNh59WgD68sjqLerC92ha`
- **Name:** `find-one`
- **Team:** setounkpe7's projects
- **Created:** 2026-04-14
- **Root directory:** `.`
- **Node.js version (Project Settings):** `22.x`
- **Framework:** Other (Vite frontend + Python FastAPI via `/api/index.py`)
- **`package.json engines.node`:** `"22.x"`

## Expected vs. observed

| | Expected (per docs) | Observed |
|---|---|---|
| No pin file | `3.12` (default) | `3.14.3` |
| `.python-version = 3.12` | `3.12` | `3.14.3` |
| `pyproject.toml requires-python = ">=3.12"` | `3.12` | `3.14.3` |
| `Pipfile.lock` with `python_version: "3.12"` | `3.12` | `3.14.3` |

## Reproductions

All commits are on branch `dev` of https://github.com/Setounkpe7/Find-One.
All builds show `Using CPython 3.14.3` as the first uv line.

| Commit | Config | Deployment |
|---|---|---|
| `da64545` | No Python pin anywhere in the repo | https://find-7yx6wpimm-setounkpe7s-projects.vercel.app |
| `4a5e4cd` | `Pipfile` + `Pipfile.lock` at repo root, `python_version: "3.12"` | https://find-o6tf20i4n-setounkpe7s-projects.vercel.app |
| `5fa70c6` | `api/{.python-version=3.12, pyproject.toml(requires-python=">=3.12"), uv.lock}` — mirror of `vercel/examples python/next-fastapi-monorepo/backend` | (reproduces same failure) |

### Representative build log (commit `da64545`, no pin)

```
2026-04-20T17:57:19  Cloning github.com/Setounkpe7/Find-One (Branch: dev, Commit: da64545)
2026-04-20T17:57:23  Using CPython 3.14.3
2026-04-20T17:57:25  Building psycopg2-binary==2.9.10
2026-04-20T17:57:26  × Failed to build `psycopg2-binary==2.9.10`
2026-04-20T17:57:26  Error: pg_config executable not found.
2026-04-20T17:57:26  Error: Command "uv pip install" exited with 1
```

No line announcing how Python was selected — unlike older builds reported
in the community (e.g. Nov 2025), which emitted
`No Python version specified in pyproject.toml or Pipfile.lock. Using latest installed version: 3.12`.

## Things already ruled out

1. **All three doc-supported pin files** (in all placements: repo root and `api/`).
2. **`PYTHON_VERSION` env var** set to `3.12` in Production + Preview + Development
   scopes (verified via `vercel env ls`, then removed; no effect).
3. **Node.js version:** switched Project Settings from `24.x` to `22.x` — log
   confirmed `Skipping build cache since Node.js version changed from "24.x"
   to "22.x"` — Python selection unchanged.
4. **`engines.node` in package.json** tightened from `">=20.19 <21 || >=22.12"`
   (which matches 24.x) to strict `"22.x"` — no effect.
5. **`vercel.json`:** using the modern `buildCommand` + `rewrites` format, no
   legacy `builds` block.
6. **Project Settings UI:** no Python Version field is visible to the account owner.

## Reference to a working baseline

`vercel/examples → python/next-fastapi-monorepo/backend` contains exactly
the same trio (`pyproject.toml`, `.python-version = 3.12`, `uv.lock`). We
mirrored that layout 1:1 in `api/` and the behavior remained `CPython 3.14.3`.

## Ask

1. Confirm whether `prj_jfPthIoTNh59WgD68sjqLerC92ha` is enrolled in an
   early 3.14 rollout.
2. If so, provide the mechanism to opt back to 3.12 or 3.13.
3. If not, investigate why the three documented pin sources are being
   ignored on this project.

## Contact

- Owner: Setounkpe7 (Mdoubogan@yahoo.fr)
- Repo: https://github.com/Setounkpe7/Find-One (branch `dev`)
- Source-code access for Vercel Support: will enable on request per
  https://vercel.com/kb/guide/how-to-allow-the-vercel-support-team-to-access-your-deployment-source-code
