#!/usr/bin/env bash
set -euo pipefail

# Verify that a shared/exported project archive does not contain secrets,
# local runtime state, build output, package folders, logs, or nested archives.
# Usage:
#   bash scripts/check-safe-archive.sh exports/jas-app-safe-YYYYMMDD-HHMMSS.zip
#   npm run qa:archive -- exports/jas-app-safe-YYYYMMDD-HHMMSS.zip
# If no archive path is provided, the newest exports/*.zip file is checked.

if [[ $# -gt 1 ]]; then
  echo "Usage: bash scripts/check-safe-archive.sh [path/to/export.zip]" >&2
  exit 2
fi

ZIP_PATH="${1:-}"
if [[ -z "$ZIP_PATH" ]]; then
  if compgen -G "exports/*.zip" >/dev/null; then
    ZIP_PATH="$(ls -t exports/*.zip | head -n 1)"
  else
    echo "Archive path is required because no exports/*.zip file was found." >&2
    echo "Run: npm run safe-export" >&2
    exit 2
  fi
fi

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "Archive not found: $ZIP_PATH" >&2
  exit 2
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "unzip command is required. Install it with: sudo apt install unzip" >&2
  exit 2
fi

entries="$(unzip -Z1 "$ZIP_PATH")"

# Path-level blocks. Keep this regex simple and portable: entries from unzip are
# plain archive paths such as jas-app/.env.local or jas-app/supabase/.temp/...
forbidden_entry_regex='(^|/)(\.env$|\.env\.(local|development|production|test|preview|staging|backup|bak)$|\.env\..*\.local$|\.env\.local\..*$|\.env-safety-backups(/|$)|\.git(/|$)|node_modules(/|$)|\.vercel(/|$)|\.netlify(/|$)|\.turbo(/|$)|\.cache(/|$)|coverage(/|$)|playwright-report(/|$)|test-results(/|$)|\.output(/|$)|dist(/|$)|dist-ssr(/|$)|\.tanstack(/|$)|\.nitro(/|$)|\.vinxi(/|$)|\.wrangler(/|$)|__unconfig[^/]*(/|$)|supabase/\.temp(/|$)|supabase/\.branches(/|$)|supabase/snippets(/|$)|backups(/|$)|exports(/|$)|.*\.log$|.*\.zip$|.*\.apk$|.*\.aab$|.*\.keystore$|.*\.pem$|.*\.key$|.*\.p12$|.*\.pfx$|.*\.crt$|.*\.csr$|.*\.mobileprovision$|signing-key-info\.txt$|\.DS_Store$)'

matches="$(printf '%s\n' "$entries" | grep -E "$forbidden_entry_regex" || true)"

if [[ -n "$matches" ]]; then
  echo "❌ Unsafe archive. Forbidden entries found:" >&2
  printf '%s\n' "$matches" >&2
  exit 1
fi

# Content-level blocks for placeholder docs are intentionally not scanned.
# The goal here is to catch accidental secret material in files that made it into
# the archive, not safe examples such as .env.example.
tmp_dir="$(mktemp -d)"
cleanup() { rm -rf "$tmp_dir"; }
trap cleanup EXIT

unzip -qq "$ZIP_PATH" -d "$tmp_dir"

if bash scripts/scan-secrets.sh "$tmp_dir" --archive-mode; then
  echo "✅ Archive looks safe: $ZIP_PATH"
else
  echo "❌ Unsafe archive. Secret-like content was detected." >&2
  exit 1
fi
