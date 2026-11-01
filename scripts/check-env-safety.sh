#!/usr/bin/env bash
set -euo pipefail

# Production/env safety checks for JAS.
# This script intentionally does not print secret values. It only reports file
# names and variable names that need attention.

red='\033[0;31m'
yellow='\033[1;33m'
green='\033[0;32m'
reset='\033[0m'

fail_count=0
warn_count=0

fail() {
  printf "%b\n" "${red}✗${reset} $1" >&2
  fail_count=$((fail_count + 1))
}

warn() {
  printf "%b\n" "${yellow}!${reset} $1" >&2
  warn_count=$((warn_count + 1))
}

ok() {
  printf "%b\n" "${green}✓${reset} $1"
}

printf "\nJAS environment safety check\n\n"

# 1) Git must never track local env/secrets.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  tracked_envs="$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -vE '(^|/)\.env\.example$' || true)"
  if [[ -n "$tracked_envs" ]]; then
    fail "Tracked env files found. Remove them from Git index before pushing:"
    printf '%s\n' "$tracked_envs" >&2
  else
    ok "No local env files are tracked by Git"
  fi
else
  warn "Not inside a Git worktree; skipped Git tracked-env check"
fi

# 2) .env.example should exist and stay placeholder-only.
if [[ ! -f .env.example ]]; then
  fail "Missing .env.example"
else
  ok "Found .env.example"
  if grep -nE 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|sb_secret_|smtp-relay\.brevo\.com.*[A-Za-z0-9_-]{24,}|VAPID_PRIVATE_KEY=[A-Za-z0-9_-]{20,}|SUPABASE_SERVICE_ROLE_KEY=eyJ' .env.example >/tmp/jas-env-example-hits.$$ 2>/dev/null; then
    fail ".env.example appears to contain real secret-like values. Keep placeholders only."
    cut -d: -f1 /tmp/jas-env-example-hits.$$ | sort -u | sed 's/^/  line /' >&2
  else
    ok ".env.example is placeholder-only"
  fi
  rm -f /tmp/jas-env-example-hits.$$
fi

# 3) Local env files may exist, but client-exposed VITE_ names must not hold private material.
mapfile -t env_files < <(find . -maxdepth 1 -type f \( -name '.env' -o -name '.env.local' -o -name '.env.development' -o -name '.env.production' -o -name '.env.test' -o -name '.env.preview' -o -name '.env.staging' -o -name '.env.*.local' \) ! -name '.env.example' -printf '%f\n' | sort)

if [[ ${#env_files[@]} -eq 0 ]]; then
  warn "No local .env files found. This is OK in CI/Vercel, but local dev needs .env.local."
else
  warn "Local env files exist. They are allowed locally but must never be shared: ${env_files[*]}"
fi

private_vite_regex='^VITE_[A-Z0-9_]*(PRIVATE|SECRET|SERVICE_ROLE|TOKEN|PASSWORD|JWT)='
for env_file in "${env_files[@]}"; do
  if grep -nE "$private_vite_regex" "$env_file" >/tmp/jas-private-vite.$$ 2>/dev/null; then
    fail "$env_file contains private-looking VITE_ variable(s). Browser-exposed env names must not hold secrets."
    sed -E 's/^([0-9]+):([^=]+)=.*/  line \1: \2=<redacted>/' /tmp/jas-private-vite.$$ >&2
  fi

  if grep -nE '^VITE_VAPID_PRIVATE_KEY=' "$env_file" >/tmp/jas-vapid-private.$$ 2>/dev/null; then
    fail "$env_file contains VITE_VAPID_PRIVATE_KEY. Rename it to VAPID_PRIVATE_KEY or remove it from frontend env."
    sed -E 's/^([0-9]+):([^=]+)=.*/  line \1: \2=<redacted>/' /tmp/jas-vapid-private.$$ >&2
  fi

  if grep -nE '^VITE_BREVO_|^VITE_SMTP_|^BREVO_SMTP_PASSWORD=|^SMTP_PASS=|^SMTP_PASSWORD=' "$env_file" >/tmp/jas-mail-secrets.$$ 2>/dev/null; then
    fail "$env_file contains mail-provider/SMTP secrets or client-exposed Brevo variables. Brevo SMTP stays in Supabase Auth SMTP settings, not Vercel frontend env."
    sed -E 's/^([0-9]+):([^=]+)=.*/  line \1: \2=<redacted>/' /tmp/jas-mail-secrets.$$ >&2
  fi

done
rm -f /tmp/jas-private-vite.$$ /tmp/jas-vapid-private.$$ /tmp/jas-mail-secrets.$$

# 4) Vercel/client env policy reminder.
if [[ -f vercel.json ]]; then
  ok "Found vercel.json"
fi

if [[ "$fail_count" -gt 0 ]]; then
  printf "\n%b\n" "${red}Env safety check failed with ${fail_count} issue group(s).${reset}" >&2
  printf "%s\n" "Run: npm run env:fix-local" >&2
  printf "%s\n" "Then review .env/.env.local manually before deploy." >&2
  exit 1
fi

if [[ "$warn_count" -gt 0 ]]; then
  printf "\n%b\n" "${yellow}Env safety check passed with ${warn_count} warning(s).${reset}"
else
  printf "\n%b\n" "${green}Env safety check passed.${reset}"
fi
