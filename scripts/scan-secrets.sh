#!/usr/bin/env bash
set -euo pipefail

# Lightweight secret scanner for JAS share/export QA.
# It is intentionally dependency-free so it can run in WSL/CI before sharing zips.
# Usage:
#   bash scripts/scan-secrets.sh [path] [--archive-mode]
#
# local .env files are skipped because they are blocked by archive path checks.

SCAN_ROOT="${1:-.}"
MODE="${2:-}"

if [[ ! -e "$SCAN_ROOT" ]]; then
  echo "Scan path not found: $SCAN_ROOT" >&2
  exit 2
fi

if ! command -v grep >/dev/null 2>&1; then
  echo "grep is required" >&2
  exit 2
fi

# Files/directories ignored for content scanning. Path-level archive checks still
# block these folders from exports separately.
exclude_args=(
  --exclude-dir=.git
  --exclude-dir=node_modules
  --exclude-dir=.output
  --exclude-dir=dist
  --exclude-dir=dist-ssr
  --exclude-dir=.tanstack
  --exclude-dir=.nitro
  --exclude-dir=.vinxi
  --exclude-dir=.wrangler
  --exclude-dir=exports
  --exclude-dir=.vercel
  --exclude-dir=.netlify
  --exclude-dir=.turbo
  --exclude-dir=.cache
  --exclude-dir=coverage
  --exclude-dir=playwright-report
  --exclude-dir=test-results
  --exclude-dir=backups
  --exclude-dir=.branches
  --exclude-dir=.temp
  --exclude-dir=snippets
  --exclude='*.zip'
  --exclude='*.log'
  --exclude='*.png'
  --exclude='*.jpg'
  --exclude='*.jpeg'
  --exclude='*.webp'
  --exclude='*.gif'
  --exclude='*.ico'
  --exclude='*.pdf'
  --exclude='*.apk'
  --exclude='*.aab'
  --exclude='*.keystore'
  --exclude='*.pem'
  --exclude='*.key'
  --exclude='*.p12'
  --exclude='*.pfx'
  --exclude='*.crt'
  --exclude='*.csr'
  --exclude='*.mobileprovision'
  --exclude='package-lock.json'
  --exclude='.env'
  --exclude='.env.local'
  --exclude='.env.production'
  --exclude='.env.development'
  --exclude='.env.test'
  --exclude='.env.preview'
  --exclude='.env.staging'
  --exclude='.env.*.local'
  --exclude='.env.example'
)

fail_count=0

scan_pattern() {
  local label="$1"
  local pattern="$2"
  local matches
  matches="$(grep -RInE "${exclude_args[@]}" -- "$pattern" "$SCAN_ROOT" 2>/dev/null \
    | grep -v 'scripts/scan-secrets.sh' \
    | grep -v 'scripts/check-env-safety.sh' \
    | grep -v 'scripts/fix-local-env-safety.sh' \
    | grep -v 'docs/PRODUCTION_ENV_SAFETY.md' \
    | grep -v 'docs/PATCH_PRODUCTION_HYGIENE_ENV_LOCKFILE.md' \
    || true)"
  if [[ -n "$matches" ]]; then
    echo "❌ ${label} detected:" >&2
    printf '%s\n' "$matches" | head -50 >&2
    fail_count=$((fail_count + 1))
  fi
}

# Private keys and common cloud/service secrets.
scan_pattern "Private key block" '-----BEGIN (RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----'
scan_pattern "Supabase service-role JWT" 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*"?cm9sZSI6InNlcnZpY2Vfcm9sZSI[A-Za-z0-9_-]*\.[A-Za-z0-9_-]{20,}'
scan_pattern "service_role JWT text" 'service_role.*eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'
scan_pattern "VITE-prefixed private secret" 'VITE_[A-Z0-9_]*(PRIVATE|SECRET|SERVICE_ROLE|TOKEN|PASSWORD|JWT)='
scan_pattern "Hardcoded VAPID private variable" 'VITE_VAPID_PRIVATE_KEY=|VAPID_PRIVATE_KEY=[A-Za-z0-9_-]{20,}'
scan_pattern "Likely Supabase service role assignment" 'SUPABASE_SERVICE_ROLE_KEY=eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'
scan_pattern "Mail provider secret in shareable files" '(^|[^A-Z0-9_])(BREVO|SMTP|SENDINBLUE)_[A-Z0-9_]*(KEY|SECRET|PASSWORD|TOKEN|PASS)=[A-Za-z0-9_./+=:@-]{12,}'
scan_pattern "Generic long secret assignment" '(^|[^A-Z0-9_])(SECRET|PRIVATE_KEY|SERVICE_ROLE_KEY|JWT_SECRET|TOKEN|PASSWORD|API_KEY)=[A-Za-z0-9_./+=:@-]{24,}'

if [[ "$fail_count" -gt 0 ]]; then
  echo "Secret scan failed with ${fail_count} issue group(s)." >&2
  exit 1
fi

echo "✅ Secret scan passed: $SCAN_ROOT"
