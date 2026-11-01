# Patch 4 — Production Hygiene + Env Safety Lockfile Fix

Branding remains: **JAS — Jatt Alliance Sindh**.

## Purpose

This patch hardens production readiness before more features are added. It focuses on env safety, ZIP/export safety, lockfile stability, and deployment verification.

## Added

- `npm run env:check`
- `npm run env:fix-local`
- `npm run lock:check`
- `npm run preflight`
- `scripts/check-env-safety.sh`
- `scripts/fix-local-env-safety.sh`
- `scripts/check-lockfile-integrity.sh`
- `docs/PRODUCTION_ENV_SAFETY.md`

## Improved

- `package-lock.json` is synced for clean `npm ci` installs.
- `scripts/verify-production-readiness.sh` now runs env and lockfile checks first.
- `scripts/safe-export.sh` excludes more local/CI/platform/key files.
- `scripts/check-safe-archive.sh` blocks more unsafe archive entries.
- `scripts/scan-secrets.sh` checks for mail-provider/SMTP secret patterns in shareable files.
- `.gitignore` and `.zipignore` include extra generated and certificate/key files.
- README and deployment docs clarify Vercel, Supabase, Brevo SMTP, and VAPID env placement.

## Required local step after applying

If your local `.env` or `.env.local` has old web-push private values using `VITE_`, run:

```bash
npm run env:fix-local
npm run env:check
```

This keeps the value but renames it from browser-exposed `VITE_VAPID_PRIVATE_KEY` to server-only `VAPID_PRIVATE_KEY`.

## Validation

```bash
npm run env:fix-local
npm run env:check
npm run lock:check
npm run check
npm run build
```

For full deployment preflight:

```bash
npm run preflight
```

For safe sharing:

```bash
npm run safe-export
npm run qa:archive -- exports/<archive-name>.zip
```
