#!/usr/bin/env bash
set -euo pipefail

red='\033[0;31m'
green='\033[0;32m'
reset='\033[0m'

fail() { printf "%b\n" "${red}✗${reset} $1" >&2; exit 1; }
ok() { printf "%b\n" "${green}✓${reset} $1"; }

printf "\nJAS lockfile integrity check\n\n"

[[ -f package.json ]] || fail "Missing package.json"
[[ -f package-lock.json ]] || fail "Missing package-lock.json"

node <<'NODE'
const fs = require('node:fs')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'))
if (lock.lockfileVersion !== 3) {
  throw new Error(`Expected package-lock lockfileVersion 3, found ${lock.lockfileVersion}`)
}
const root = lock.packages && lock.packages['']
if (!root) throw new Error('package-lock.json is missing packages[""] root entry')
const groups = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
for (const group of groups) {
  const a = pkg[group] || {}
  const b = root[group] || {}
  for (const [name, version] of Object.entries(a)) {
    if (b[name] !== version) {
      throw new Error(`package-lock root ${group}.${name} is ${b[name] || '<missing>'}, expected ${version}`)
    }
  }
}
console.log('✓ package.json and package-lock root dependencies match')
NODE

if grep -RInE 'applied-caas|caas-gateway|internal\.api\.openai|packages\.hub' package-lock.json >/tmp/jas-lock-internal.$$ 2>/dev/null; then
  cat /tmp/jas-lock-internal.$$ >&2
  rm -f /tmp/jas-lock-internal.$$
  fail "Internal/non-public registry URL found in package-lock.json"
fi
rm -f /tmp/jas-lock-internal.$$
ok "No internal registry URLs found in package-lock.json"

# npm ci --dry-run catches package/lock mismatches without modifying node_modules.
npm ci --ignore-scripts --no-audit --no-fund --dry-run >/tmp/jas-npm-ci-dry-run.$$ 2>&1 || {
  cat /tmp/jas-npm-ci-dry-run.$$ >&2
  rm -f /tmp/jas-npm-ci-dry-run.$$
  fail "npm ci dry-run failed. Run: npm run lock:sync"
}
rm -f /tmp/jas-npm-ci-dry-run.$$
ok "npm ci dry-run passed"

printf "\n%b\n" "${green}Lockfile integrity check passed.${reset}"
