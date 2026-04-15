#!/usr/bin/env bash
# Start Find-One in development mode: backend (uvicorn) + frontend (Vite) +
# opens the app in the default browser once both are ready.
#
# Usage:
#   scripts/dev.sh                # start everything and open the browser
#   scripts/dev.sh --no-browser   # skip the browser step (useful on CI/containers)
#   scripts/dev.sh --help
#
# Ctrl+C stops both processes cleanly.

set -euo pipefail

# ─── Bash version check ──────────────────────────────────────────────
# Uses ${var^^}, wait -n — both require bash 4+.
# macOS ships bash 3.2 by default; install a modern one: `brew install bash`.
if (( BASH_VERSINFO[0] < 4 )); then
  echo "[dev] bash ${BASH_VERSION} is too old; need bash 4+ (on macOS: brew install bash, then run with /opt/homebrew/bin/bash scripts/dev.sh)" >&2
  exit 1
fi

# ─── Config ──────────────────────────────────────────────────────────
BACKEND_PORT=8000
FRONTEND_PORT=5173
OPEN_BROWSER=1

# ─── Args ────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-browser) OPEN_BROWSER=0; shift ;;
    -h|--help)
      sed -n '2,11p' "$0"
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

# ─── Paths ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

# ─── Colour helpers ──────────────────────────────────────────────────
if [[ -t 1 ]]; then
  C_RESET='\033[0m' C_BOLD='\033[1m' C_DIM='\033[2m'
  C_GREEN='\033[32m' C_YELLOW='\033[33m' C_RED='\033[31m' C_BLUE='\033[34m'
else
  C_RESET='' C_BOLD='' C_DIM='' C_GREEN='' C_YELLOW='' C_RED='' C_BLUE=''
fi

log()  { printf "${C_DIM}[dev]${C_RESET} %s\n" "$*"; }
info() { printf "${C_BLUE}${C_BOLD}[dev]${C_RESET} %s\n" "$*"; }
ok()   { printf "${C_GREEN}${C_BOLD}[dev]${C_RESET} %s\n" "$*"; }
warn() { printf "${C_YELLOW}${C_BOLD}[dev]${C_RESET} %s\n" "$*" >&2; }
die()  { printf "${C_RED}${C_BOLD}[dev]${C_RESET} %s\n" "$*" >&2; exit 1; }

# ─── Preflight ───────────────────────────────────────────────────────
command -v uvicorn >/dev/null 2>&1 || die "uvicorn not found on PATH. Activate your Python env or run: pip install -r backend/requirements.txt"
command -v npm >/dev/null 2>&1 || die "npm not found on PATH. Install Node.js 20+."

[[ -d "$FRONTEND_DIR/node_modules" ]] || die "frontend/node_modules missing. Run: cd frontend && npm install"
[[ -f "$ROOT/.env" ]] || warn ".env not found at repo root — backend may start with empty Supabase config."

# Bash-native port check using /dev/tcp (no nc/lsof needed).
port_in_use() {
  local port=$1
  (exec 3<>/dev/tcp/127.0.0.1/"$port") 2>/dev/null && { exec 3<&- 3>&-; return 0; }
  return 1
}

port_in_use "$BACKEND_PORT"  && die "Port $BACKEND_PORT already in use. Stop the other process or change BACKEND_PORT."
port_in_use "$FRONTEND_PORT" && die "Port $FRONTEND_PORT already in use. Stop the other process or change FRONTEND_PORT."

# ─── State + cleanup ─────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  local code=$?
  trap - EXIT INT TERM
  printf "\n"
  info "Stopping dev servers…"

  # Try graceful SIGTERM first; kill children too (uvicorn --reload + vite spawn workers).
  for pid in $BACKEND_PID $FRONTEND_PID; do
    [[ -n "$pid" ]] || continue
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
  done

  # Give them up to 3s to exit, then SIGKILL anything still standing.
  for _ in 1 2 3; do
    local alive=0
    for pid in $BACKEND_PID $FRONTEND_PID; do
      [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null && alive=1
    done
    (( alive == 0 )) && break
    sleep 1
  done
  for pid in $BACKEND_PID $FRONTEND_PID; do
    [[ -n "$pid" ]] || continue
    pkill -KILL -P "$pid" 2>/dev/null || true
    kill -KILL "$pid" 2>/dev/null || true
  done

  exit "$code"
}
trap cleanup EXIT INT TERM

# ─── Start backend ───────────────────────────────────────────────────
info "Starting backend on :$BACKEND_PORT (uvicorn --reload)…"
(
  cd "$BACKEND_DIR"
  exec uvicorn app.main:app --reload --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

# ─── Start frontend ──────────────────────────────────────────────────
info "Starting frontend on :$FRONTEND_PORT (vite)…"
(
  cd "$FRONTEND_DIR"
  exec npm run dev -- --port "$FRONTEND_PORT" --strictPort
) &
FRONTEND_PID=$!

# ─── Wait for readiness ──────────────────────────────────────────────
wait_for_port() {
  local port=$1 name=$2 timeout=${3:-30}
  for ((i=0; i<timeout; i++)); do
    if port_in_use "$port"; then
      ok "$name ready on http://localhost:$port"
      return 0
    fi
    # If the child has died, bail out with its exit status.
    local pid_var="${name^^}_PID"
    local pid="${!pid_var:-}"
    if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
      die "$name process exited before becoming ready. Check the output above."
    fi
    sleep 1
  done
  die "$name did not come up on port $port within ${timeout}s."
}

wait_for_port "$BACKEND_PORT"  Backend  30
wait_for_port "$FRONTEND_PORT" Frontend 30

# ─── Open browser ────────────────────────────────────────────────────
APP_URL="http://localhost:$FRONTEND_PORT"
if (( OPEN_BROWSER )); then
  if command -v xdg-open >/dev/null 2>&1; then
    (xdg-open "$APP_URL" >/dev/null 2>&1 &) || true
  elif command -v open >/dev/null 2>&1; then  # macOS
    (open "$APP_URL" >/dev/null 2>&1 &) || true
  else
    warn "No xdg-open/open found; visit $APP_URL manually."
  fi
fi

printf "\n"
ok "Find-One is up. ${C_BOLD}${APP_URL}${C_RESET}"
log "API:      http://localhost:$BACKEND_PORT"
log "Press Ctrl+C to stop."
printf "\n"

# Block until one of the children dies (or the user hits Ctrl+C).
# Capture the exit code so crashes propagate out of this script.
CHILD_EXIT=0
wait -n "$BACKEND_PID" "$FRONTEND_PID" || CHILD_EXIT=$?
if (( CHILD_EXIT != 0 )); then
  warn "A process exited with code $CHILD_EXIT — shutting the other down."
else
  warn "A process exited cleanly — shutting the other down."
fi
exit "$CHILD_EXIT"
