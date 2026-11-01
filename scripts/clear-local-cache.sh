#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

rm -rf \
  .nitro \
  .output \
  .tanstack \
  .vinxi \
  node_modules/.vite \
  node_modules/.cache \
  dist

echo "Local build/dev caches cleared. Restart npm run dev after this."
