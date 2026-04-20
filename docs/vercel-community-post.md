# Community post (Help → tag: `python`)

Paste the content below into a new topic at
https://community.vercel.com/new-topic?category=help&tags=python

---

## Title

`.python-version`, `pyproject.toml` and `Pipfile.lock` all ignored — builder forces CPython 3.14.3

## Body

Hi — hoping someone has seen this.

I’m on a monorepo (Vite frontend + FastAPI under `api/index.py`) on the
Hobby plan. The Python builder always picks **CPython 3.14.3** regardless
of which of the three documented pin mechanisms I use, at any location.

The docs say 3.12 is the default; on my project it effectively isn’t.

### What I’ve tried (all on a fresh push, build cache skipped)

| Config | Result |
|---|---|
| No Python pin anywhere | `Using CPython 3.14.3` |
| `.python-version = 3.12` at repo root | `Using CPython 3.14.3` |
| `.python-version = 3.13` at repo root | `Using CPython 3.14.3` |
| `.python-version` inside `api/` | `Using CPython 3.14.3` |
| `pyproject.toml` at root with `requires-python = ">=3.12"` | `Using CPython 3.14.3` |
| `pyproject.toml` inside `api/` with `requires-python = "==3.12.*"` + `.python-version` + `uv.lock` (exact mirror of `vercel/examples/python/next-fastapi-monorepo/backend`) | `Using CPython 3.14.3` |
| `Pipfile` + `Pipfile.lock` at root with `python_version = "3.12"` | `Using CPython 3.14.3` |
| `PYTHON_VERSION=3.12` env var on the project (all three scopes) | `Using CPython 3.14.3` |
| Project Settings → Node.js: 24.x → 22.x (confirmed by `Skipping build cache since Node.js version changed from "24.x" to "22.x"`) | `Using CPython 3.14.3` |
| `package.json engines.node = "22.x"` | `Using CPython 3.14.3` |

### Representative build log (no pin at all)

```
Cloning github.com/…/… (Branch: dev, Commit: …)
Using CPython 3.14.3
Building psycopg2-binary==2.9.10
× Failed to build `psycopg2-binary==2.9.10`
Error: pg_config executable not found.
Error: Command "uv pip install" exited with 1
```

Note: older community posts (e.g. `Deploy start to fail with uvicorn: command not found`, Nov 2025)
show builders that emitted
`No Python version specified in pyproject.toml or Pipfile.lock. Using latest installed version: 3.12`.
My builds no longer emit any “Python version specified” line — uv just
declares `Using CPython 3.14.3` directly.

### vercel.json

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2,
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.py" },
    { "source": "/auth/(.*)", "destination": "/api/index.py" },
    { "source": "/health", "destination": "/api/index.py" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### api/index.py

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.main import app  # noqa: F401
```

### Project context

- Created 2026-04-14 (recent)
- Framework Preset: Other
- Node.js: 22.x (recently switched from 24.x, no effect on Python)
- Region: iad1
- Plan: Hobby
- `package.json` lives in `frontend/`
- Python source lives in `api/index.py` + a shared package in `backend/`

### Questions

1. Is the project silently enrolled in an early 3.14 default rollout?
2. If yes, what’s the opt-out path on Hobby — any project setting, env var,
   or file I can commit?
3. If no, why are the three documented pin files being ignored? Is there
   an additional prerequisite (a specific file name, a specific location,
   a specific `vercel.json` shape)?

Happy to share more of the build log on request. Thanks!
