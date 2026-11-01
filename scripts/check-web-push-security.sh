#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FUNCTION_FILE="$ROOT_DIR/supabase/functions/send-web-push/index.ts"

if [[ ! -f "$FUNCTION_FILE" ]]; then
  echo "❌ Missing $FUNCTION_FILE" >&2
  exit 1
fi

required_patterns=(
  "PUSH_SEND_SECRET"
  "getBearerToken"
  "supabase.auth.getUser"
  "ADMIN_ROLES"
  "notification_id is required for member push requests"
  "Forbidden"
  "cleanActionUrl"
  "x-push-secret"
)

for pattern in "${required_patterns[@]}"; do
  if ! grep -q "$pattern" "$FUNCTION_FILE"; then
    echo "❌ Web push security check failed: missing pattern '$pattern'" >&2
    exit 1
  fi
done

if grep -q "Access-Control-Allow-Origin': '\*'" "$FUNCTION_FILE"; then
  echo "❌ Web push security check failed: wildcard CORS is still present" >&2
  exit 1
fi

echo "✅ Web push security checks passed."
