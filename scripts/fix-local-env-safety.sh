#!/usr/bin/env bash
set -euo pipefail

# Safely rename known client-exposed private env names in local env files.
# This keeps values in place but removes the dangerous VITE_ prefix so they are
# not bundled into the browser. It does not print secret values.

files=()
while IFS= read -r f; do
  files+=("$f")
done < <(find . -maxdepth 1 -type f \( -name '.env' -o -name '.env.local' -o -name '.env.development' -o -name '.env.production' -o -name '.env.test' -o -name '.env.preview' -o -name '.env.staging' -o -name '.env.*.local' \) ! -name '.env.example' -printf '%f\n' | sort)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No local env files found. Nothing to fix."
  exit 0
fi

changed=0
for file in "${files[@]}"; do
  tmp="$(mktemp)"
  cp "$file" "$tmp"

  # Specific migrations for current JAS web-push env mistakes.
  sed -i \
    -e 's/^VITE_VAPID_PRIVATE_KEY=/VAPID_PRIVATE_KEY=/' \
    -e 's/^VITE_VAPID_SUBJECT=/VAPID_SUBJECT=/' \
    -e 's/^VITE_SUPABASE_SERVICE_ROLE_KEY=/SUPABASE_SERVICE_ROLE_KEY=/' \
    "$tmp"

  if ! cmp -s "$file" "$tmp"; then
    backup_dir=".env-safety-backups"
    mkdir -p "$backup_dir"
    cp "$file" "$backup_dir/${file}.bak.$(date +%Y%m%d%H%M%S)"
    mv "$tmp" "$file"
    echo "Updated $file and created a timestamped backup in $backup_dir/."
    changed=$((changed + 1))
  else
    rm -f "$tmp"
    echo "No changes needed in $file"
  fi
done

if [[ "$changed" -gt 0 ]]; then
  echo "Local env safety fix complete. Run: npm run env:check"
else
  echo "Local env files already look safe for known VITE_ private-key mistakes."
fi
