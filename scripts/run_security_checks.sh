#!/bin/bash
# Runs all security tools locally and saves timestamped JSON reports.
# Usage: ./scripts/run_security_checks.sh
# OWASP ZAP requires Docker + running app (optional, skipped by default)
# Checkov is optional — install separately with: pip install checkov

set -e

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_DIR="security-reports/${TIMESTAMP}"
mkdir -p "$REPORT_DIR"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== TruffleHog ==="
trufflehog git file://. --json > "${REPORT_DIR}/trufflehog_${TIMESTAMP}.json" 2>&1 || true

echo "=== pip-audit (Python SCA) ==="
pip-audit -f json -o "${REPORT_DIR}/pip-audit_${TIMESTAMP}.json" 2>&1 || true

echo "=== npm audit (JS SCA) ==="
cd frontend
npm audit --json > "../${REPORT_DIR}/npm-audit_${TIMESTAMP}.json" 2>&1 || true
cd ..

echo "=== Bandit (Python SAST) ==="
bandit -r backend/app/ -f json -o "${REPORT_DIR}/bandit_${TIMESTAMP}.json" 2>&1 || true

echo "=== Semgrep (multi-language SAST) ==="
semgrep scan --config=auto --json --output="${REPORT_DIR}/semgrep_${TIMESTAMP}.json" backend/ frontend/src/ 2>&1 || true

# === OPTIONAL: Checkov (IaC scanning) ===
# Install with: pip install checkov
# Uncomment to enable:
# echo "=== Checkov (IaC) ==="
# checkov -d . --output json > "${REPORT_DIR}/checkov_${TIMESTAMP}.json" 2>&1 || true

# === OPTIONAL: OWASP ZAP (requires Docker + running app) ===
# docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8000 -J "${REPORT_DIR}/zap_${TIMESTAMP}.json" || true

echo ""
echo "Reports saved to ${REPORT_DIR}/"
echo "Review for HIGH or CRITICAL findings before committing."
