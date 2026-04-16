#!/bin/bash
# Run this once after `docker compose up` to seed secrets into Vault.
# Usage: ./scripts/vault_init.sh

set -e

VAULT_ADDR=${VAULT_ADDR:-http://localhost:8200}
VAULT_TOKEN=${VAULT_TOKEN:-dev-root-token}

vault_cmd() {
  VAULT_ADDR=$VAULT_ADDR VAULT_TOKEN=$VAULT_TOKEN vault "$@"
}

echo "Enabling kv-v2 secrets engine..."
vault_cmd secrets enable -path=findone kv-v2 2>/dev/null || echo "Already enabled"

echo "Writing secrets..."
vault_cmd kv put findone/api \
  anthropic_api_key="${ANTHROPIC_API_KEY}" \
  jsearch_api_key="${JSEARCH_API_KEY}" \
  supabase_service_key="${SUPABASE_SERVICE_KEY}" \
  supabase_jwt_secret="${SUPABASE_JWT_SECRET}"

echo "Done. Secrets stored at findone/api"
