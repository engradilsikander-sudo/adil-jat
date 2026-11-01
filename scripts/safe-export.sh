#!/usr/bin/env bash
set -euo pipefail

# Create a share-safe project archive for JAS App.
# This intentionally excludes secrets, git history, dependencies, build output,
# local Supabase state, logs, backups, and previously generated zip files.

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

EXPORT_DIR="${1:-exports}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_NAME="jas-app-safe-${STAMP}.zip"
ARCHIVE_PATH="${EXPORT_DIR%/}/${ARCHIVE_NAME}"
TMP_DIR="$(mktemp -d)"
PROJECT_DIR="$TMP_DIR/jas-app"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$EXPORT_DIR" "$PROJECT_DIR"

RSYNC_EXCLUDES=(
  "--exclude=.env"
  "--exclude=.env.local"
  "--exclude=.env.production"
  "--exclude=.env.development"
  "--exclude=.env.test"
  "--exclude=.env.preview"
  "--exclude=.env.staging"
  "--exclude=.env.*.local"
  "--exclude=.env.backup"
  "--exclude=.env.bak"
  "--exclude=.env.local.*"
  "--exclude=.env-safety-backups/"
  "--exclude=*.local"
  "--exclude=.git/"
  "--exclude=node_modules/"
  "--exclude=.vercel/"
  "--exclude=.netlify/"
  "--exclude=.turbo/"
  "--exclude=.cache/"
  "--exclude=coverage/"
  "--exclude=playwright-report/"
  "--exclude=test-results/"
  "--exclude=.output/"
  "--exclude=dist/"
  "--exclude=dist-ssr/"
  "--exclude=.tanstack/"
  "--exclude=.nitro/"
  "--exclude=.vinxi/"
  "--exclude=.wrangler/"
  "--exclude=__unconfig*/"
  "--exclude=supabase/.temp/"
  "--exclude=supabase/.branches/"
  "--exclude=supabase/snippets/"
  "--exclude=backups/"
  "--exclude=exports/"
  "--exclude=*.log"
  "--exclude=*.zip"
  "--exclude=.DS_Store"
  "--exclude=*.apk"
  "--exclude=*.aab"
  "--exclude=*.keystore"
  "--exclude=*.pem"
  "--exclude=*.key"
  "--exclude=*.p12"
  "--exclude=*.pfx"
  "--exclude=*.crt"
  "--exclude=*.csr"
  "--exclude=*.mobileprovision"
  "--exclude=signing-key-info.txt"
  "--exclude=JAS-test.apk"
  "--exclude=JAS.apk"
  "--exclude=JAS.aab"
)

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "${RSYNC_EXCLUDES[@]}" ./ "$PROJECT_DIR/"
else
  echo "rsync not found; using tar fallback"
  tar \
    --exclude='./.env' \
    --exclude='./.env.local' \
    --exclude='./.env.production' \
    --exclude='./.env.development' \
    --exclude='./.env.test' \
    --exclude='./.env.preview' \
    --exclude='./.env.staging' \
    --exclude='./.env.*.local' \
    --exclude='./.env.local.*' \
    --exclude='./.env-safety-backups' \
    --exclude='./.env.bak' \
    --exclude='./.env.backup' \
    --exclude='*.local' \
    --exclude='./.git' \
    --exclude='./node_modules' \
    --exclude='./test-results' \
    --exclude='./playwright-report' \
    --exclude='./coverage' \
    --exclude='./.cache' \
    --exclude='./.turbo' \
    --exclude='./.netlify' \
    --exclude='./.vercel' \
    --exclude='./.output' \
    --exclude='./dist' \
    --exclude='./dist-ssr' \
    --exclude='./.tanstack' \
    --exclude='./.nitro' \
    --exclude='./.vinxi' \
    --exclude='./.wrangler' \
    --exclude='./__unconfig*' \
    --exclude='./supabase/.temp' \
    --exclude='./supabase/.branches' \
    --exclude='./supabase/snippets' \
    --exclude='./backups' \
    --exclude='./exports' \
    --exclude='*.log' \
    --exclude='*.zip' \
    --exclude='.DS_Store' \
    --exclude='*.apk' \
    --exclude='*.aab' \
    --exclude='*.keystore' \
    --exclude='*.mobileprovision' \
    --exclude='*.csr' \
    --exclude='*.crt' \
    --exclude='*.pfx' \
    --exclude='*.p12' \
    --exclude='*.key' \
    --exclude='*.pem' \
    --exclude='signing-key-info.txt' \
    --exclude='JAS-test.apk' \
    --exclude='JAS.apk' \
    --exclude='JAS.aab' \
    -cf - . | (cd "$PROJECT_DIR" && tar -xf -)
fi

# Safety guard: fail if any blocked sensitive/local folders slipped through.
blocked_paths="$(find "$PROJECT_DIR" \
  \( -name '.env' \
  -o -name '.env.local' \
  -o -name '.env.production' \
  -o -name '.env.development' \
  -o -name '.env.test' \
  -o -name '.env.preview' \
  -o -name '.env.staging' \
  -o -name '*.pfx' \
  -o -name '*.p12' \
  -o -name '*.key' \
  -o -name '*.pem' \
  -o -name 'test-results' \
  -o -name 'playwright-report' \
  -o -name 'coverage' \
  -o -name '.cache' \
  -o -name '.turbo' \
  -o -name '.netlify' \
  -o -name '.vercel' \
  -o -name '.env.bak' \
  -o -name '.env.backup' \
  -o -name '*.mobileprovision' \
  -o -name '*.csr' \
  -o -name '*.crt' \
  -o -name '.env.local.*' \
  -o -name '.env-safety-backups' \
  -o -name '.git' \
  -o -name 'node_modules' \
  -o -name '.output' \
  -o -name 'dist' \
  -o -name 'dist-ssr' \
  -o -name '*.zip' \
  -o -name '*.log' \
  -o -name '*.apk' \
  -o -name '*.aab' \
  -o -name '*.keystore' \
  -o -name 'signing-key-info.txt' \
  -o -path '*/supabase/.temp' \
  -o -path '*/supabase/.branches' \
  -o -path '*/supabase/snippets' \
  \) -print | head -50)"

if [[ -n "$blocked_paths" ]]; then
  echo "Safe export blocked. Sensitive/local files were still present:" >&2
  echo "$blocked_paths" >&2
  exit 1
fi

# Content scan before zipping catches accidental hardcoded keys in shareable files.
if ! bash scripts/scan-secrets.sh "$PROJECT_DIR" --archive-mode; then
  echo "Safe export blocked. Secret-like content was detected in export staging." >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "zip command not found. Install it with: sudo apt install zip" >&2
  exit 1
fi

(
  cd "$TMP_DIR"
  zip -qr "$ROOT_DIR/$ARCHIVE_PATH" jas-app
)

bash scripts/check-safe-archive.sh "$ARCHIVE_PATH"

bytes="$(wc -c < "$ARCHIVE_PATH" | tr -d ' ')"
echo "Safe export created: $ARCHIVE_PATH (${bytes} bytes)"
echo "Excluded: .env*, .git, node_modules, build output, Supabase temp/branches/snippets, platform state, backups, exports, logs, zips, Android packages/keys and certificate files"
