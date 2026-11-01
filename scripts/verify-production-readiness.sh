#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${SITE_URL:-https://jasofficial.org}"
SKIP_BUILD="${SKIP_BUILD:-0}"

green='\033[0;32m'
yellow='\033[1;33m'
red='\033[0;31m'
reset='\033[0m'

log() { printf "%b\n" "${green}✓${reset} $1"; }
warn() { printf "%b\n" "${yellow}!${reset} $1"; }
fail() { printf "%b\n" "${red}✗${reset} $1"; exit 1; }
require_file() { [[ -f "$1" ]] || fail "Missing required file: $1"; log "Found $1"; }
require_dir() { [[ -d "$1" ]] || fail "Missing required directory: $1"; log "Found $1"; }

printf "\nJAS Production Readiness Verification\n"
printf "Site URL: %s\n\n" "$SITE_URL"

require_file package.json
require_file package-lock.json
require_file vite.config.ts
require_file tsconfig.json
require_file public/manifest.json
require_file public/sw.js
require_file public/offline.html
require_file public/favicon.ico
require_file public/icon-192.png
require_file public/icon-512.png
require_file public/apple-touch-icon.png
require_file public/.well-known/assetlinks.json
require_dir supabase/migrations
require_file scripts/check-env-safety.sh
require_file scripts/check-lockfile-integrity.sh
require_file scripts/safe-export.sh
require_file scripts/check-safe-archive.sh

# Fail early on local/client secret exposure and package-lock drift.
bash scripts/check-env-safety.sh
bash scripts/check-lockfile-integrity.sh

node <<'NODE'
const fs = require('node:fs')
const manifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'))
const required = ['name', 'short_name', 'start_url', 'scope', 'display', 'theme_color', 'background_color', 'icons']
for (const key of required) {
  if (!manifest[key]) throw new Error(`manifest.json missing ${key}`)
}
if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) {
  throw new Error('manifest.json must include 192 and 512 icons')
}
const has192 = manifest.icons.some((icon) => String(icon.sizes || '').includes('192x192'))
const has512 = manifest.icons.some((icon) => String(icon.sizes || '').includes('512x512'))
if (!has192 || !has512) throw new Error('manifest.json must include 192x192 and 512x512 icons')
JSON.parse(fs.readFileSync('public/.well-known/assetlinks.json', 'utf8'))
console.log('✓ manifest.json and assetlinks.json are valid JSON')
NODE

if [[ -f .env.local ]]; then
  warn ".env.local exists locally. This is OK locally, but it must never be committed or shared."
fi

if grep -RIn \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=.output \
  --exclude-dir=dist \
  --exclude-dir=dist-ssr \
  --exclude-dir=exports \
  --exclude-dir=.tanstack \
  --exclude-dir=.nitro \
  --exclude-dir=.vinxi \
  --exclude='*.zip' \
  --exclude='package-lock.json' \
  -E 'VITE_[A-Z0-9_]*(PRIVATE|SECRET|SERVICE_ROLE|PASSWORD|TOKEN|JWT|KEY)=' . \
  | grep -v 'VITE_SUPABASE_ANON_KEY' \
  | grep -v 'VITE_VAPID_PUBLIC_KEY'; then
  fail "Private-looking VITE_ environment variable assignment detected. Rename private secrets to server-only names."
else
  log "No private-looking VITE_ secret assignments detected in project files"
fi

if [[ -f scripts/scan-secrets.sh ]]; then
  log "Secret scanner available: scripts/scan-secrets.sh"
else
  fail "Missing scripts/scan-secrets.sh"
fi

for ignore_file in .gitignore .zipignore; do
  require_file "$ignore_file"
  for required_pattern in '.env.local' 'supabase/.temp/' 'supabase/.branches/' 'exports/' '*.zip' '*.apk' '*.aab' '*.keystore'; do
    if ! grep -Fq "$required_pattern" "$ignore_file"; then
      fail "$ignore_file is missing safety pattern: $required_pattern"
    fi
  done
  log "$ignore_file includes required safety patterns"
done

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git ls-files --error-unmatch .env.local >/dev/null 2>&1; then
    fail ".env.local is tracked by Git. Remove it immediately."
  fi
  if git ls-files | grep -E '(^|/)(signing\.keystore|signing-key-info\.txt|.*\.apk|.*\.aab)$' >/dev/null; then
    fail "Android signing/package output is tracked by Git. Remove generated APK/AAB/keystore files."
  fi
  log "Git secret/package file checks passed"
fi

if [[ "$SKIP_BUILD" != "1" ]]; then
  npm run check
  npm run build
  log "TypeScript and production build passed"
else
  warn "Skipped npm run check/build because SKIP_BUILD=1"
fi

if command -v curl >/dev/null 2>&1; then
  printf "\nRemote deployment checks for %s\n" "$SITE_URL"
  curl -fsSI "$SITE_URL/manifest.json" >/dev/null && log "Remote manifest.json reachable"
  curl -fsSI "$SITE_URL/sw.js" >/dev/null && log "Remote sw.js reachable"
  curl -fsSI "$SITE_URL/offline.html" >/dev/null && log "Remote offline.html reachable"
  curl -fsSI "$SITE_URL/.well-known/assetlinks.json" >/dev/null && log "Remote assetlinks.json reachable"
else
  warn "curl not found; skipped remote deployment checks"
fi

printf "\nProduction readiness verification complete.\n"
