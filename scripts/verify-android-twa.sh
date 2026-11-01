#!/usr/bin/env bash
set -euo pipefail

PRIMARY_URL="${PRIMARY_URL:-https://jasofficial.org}"
WWW_URL="${WWW_URL:-https://www.jasofficial.org}"
PACKAGE_NAME="${PACKAGE_NAME:-org.jasofficial.twa}"
ANDROID_PACKAGE_DIR="${ANDROID_PACKAGE_DIR:-$HOME/Downloads/jas-android-package}"

MANIFEST_FILE="public/manifest.json"
ASSETLINKS_FILE="public/.well-known/assetlinks.json"

echo
echo "JAS Android TWA / PWABuilder Verification"
echo "Primary URL: $PRIMARY_URL"
echo "WWW URL: $WWW_URL"
echo "Package name: $PACKAGE_NAME"
echo

if [[ ! -f "$MANIFEST_FILE" ]]; then
  echo "✗ Missing $MANIFEST_FILE"
  exit 1
fi

if [[ ! -f "$ASSETLINKS_FILE" ]]; then
  echo "✗ Missing $ASSETLINKS_FILE"
  exit 1
fi

node <<NODE
const fs = require('fs')

const manifest = JSON.parse(fs.readFileSync('$MANIFEST_FILE', 'utf8'))
const assetlinks = JSON.parse(fs.readFileSync('$ASSETLINKS_FILE', 'utf8'))
const packageName = '$PACKAGE_NAME'

if (!manifest.name) throw new Error('manifest.json missing name')
if (!manifest.short_name) throw new Error('manifest.json missing short_name')
if (!manifest.start_url) throw new Error('manifest.json missing start_url')
if (!manifest.display) throw new Error('manifest.json missing display')
if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
  throw new Error('manifest.json missing icons')
}

const twaEntry = assetlinks.find((entry) =>
  entry &&
  Array.isArray(entry.relation) &&
  entry.relation.includes('delegate_permission/common.handle_all_urls') &&
  entry.target &&
  entry.target.namespace === 'android_app' &&
  entry.target.package_name === packageName &&
  Array.isArray(entry.target.sha256_cert_fingerprints) &&
  entry.target.sha256_cert_fingerprints.length > 0
)

if (!twaEntry) {
  throw new Error('assetlinks.json does not contain expected package/fingerprint entry')
}
NODE

echo "✓ manifest.json and assetlinks.json are TWA-ready"

PRIMARY_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "$PRIMARY_URL/.well-known/assetlinks.json")"
if [[ "$PRIMARY_STATUS" != "200" ]]; then
  echo "✗ Primary domain assetlinks.json expected HTTP 200, got $PRIMARY_STATUS"
  exit 1
fi

echo "✓ Primary domain assetlinks.json returns HTTP 200"

WWW_HEADERS="$(curl -sI "$WWW_URL/.well-known/assetlinks.json" || true)"
if echo "$WWW_HEADERS" | grep -qE "HTTP/[0-9.]+ 30[178]"; then
  if echo "$WWW_HEADERS" | grep -qi "location: $PRIMARY_URL/.well-known/assetlinks.json"; then
    echo "✓ WWW domain redirects as expected"
  else
    echo "! WWW domain redirects, but location may not be the primary assetlinks URL"
  fi
elif echo "$WWW_HEADERS" | grep -qE "HTTP/[0-9.]+ 200"; then
  echo "! WWW domain returns 200. This is OK only if APK was generated for www domain."
else
  echo "! Could not confirm WWW redirect"
fi

if [[ -d "$ANDROID_PACKAGE_DIR" ]]; then
  APK_FILE="$(find "$ANDROID_PACKAGE_DIR" -name "*.apk" | head -n 1 || true)"
  AAB_FILE="$(find "$ANDROID_PACKAGE_DIR" -name "*.aab" | head -n 1 || true)"

  if [[ -n "$APK_FILE" ]]; then
    echo "✓ Found test APK: $APK_FILE"
  else
    echo "! APK not found in $ANDROID_PACKAGE_DIR"
  fi

  if [[ -n "$AAB_FILE" ]]; then
    echo "✓ Found Play Store AAB: $AAB_FILE"
  else
    echo "! AAB not found in $ANDROID_PACKAGE_DIR"
  fi

  if [[ -f "$ANDROID_PACKAGE_DIR/signing.keystore" ]]; then
    echo "! Signing keystore exists in package directory. Back it up privately; never commit it."
  fi

  if [[ -f "$ANDROID_PACKAGE_DIR/signing-key-info.txt" ]]; then
    echo "! Signing key info exists in package directory. Back it up privately; never commit it."
  fi
else
  echo "! Android package directory not found: $ANDROID_PACKAGE_DIR"
fi

echo
echo "Android TWA verification complete."
