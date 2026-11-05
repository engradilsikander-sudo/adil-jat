# JAS Mobile UX.12 — Release Verification & Sign-Off

**Baseline:** `56a2d75` (UX.11); release gate, **not** a new application feature.
**Scope:** responsive web / installable PWA / Android Chrome. The Android Play Store TWA requires its own signed package checks.

This document starts **NOT APPROVED**. Passing synthetic automated tests does **not** establish real-role data security, device reliability, payment integrity, or store approval.

## A. Automated checks — required

- [ ] `node --test scripts/check-mobile-release.test.mjs` — metadata/preflight regression tests pass
- [ ] `node scripts/check-mobile-release.mjs` — checked-in PWA, icons, assetlinks and offline resources pass
- [ ] `npm run check` — no TypeScript errors
- [ ] `npx vitest run --maxWorkers=1` — complete unit suite passes
- [ ] `npm run build` — production bundle builds
- [ ] `npx playwright test --project=mobile --workers=1` — original 6 + UX.12 6 mobile tests pass
- [ ] `git diff --check` and `git diff --cached --check` pass
- [ ] `git status` reviewed, local `supabase/config.toml` remains **unstaged**
- [ ] `bash scripts/check-env-safety.sh`, `bash scripts/check-lockfile-integrity.sh` and safe secret-scanning policies checked

For this patch use the bundle's `VALIDATE.sh` to run these local checks. Do **not** automatically change remote data or alter project configuration.

## B. Android Chrome and installed-PWA device matrix — required

Record device model, OS version, browser version, language, date and result; mark issues with severity and reproduction steps. Do not attach member PII or authenticated tokens to evidence.

| Device | Browser / mode | English | Urdu RTL | Sindhi RTL | Offline → online | Status |
|---|---|---|---|---|---|---|
| Android 320px-class | Chrome browser | ☐ | ☐ | ☐ | ☐ | NOT TESTED |
| Android 390px-class | Chrome browser | ☐ | ☐ | ☐ | ☐ | NOT TESTED |
| Android installed PWA | Standalone | ☐ | ☐ | ☐ | ☐ | NOT TESTED |
| iPhone Safari (if supported) | Browser / home screen | ☐ | ☐ | ☐ | ☐ | NOT TESTED |

Also check short viewports (keyboard open), zoom/text scaling, safe-area insets, no sideways scroll, 44px touch targets where practical, visible focus states, screen-reader accessible names, dialogs/Escape/focus return, and no unintended browser zoom on text inputs.

## C. Production-equivalent workflow testing — **staging accounts only**

- [ ] Membership registration: invalid/valid fields, focus shift, optional draft, refresh, leave/cancel, receipt upload and account recovery.
- [ ] Pending/rejected/approved member views: no unauthorised card/download or payment bypass.
- [ ] Notifications: fetched-ID read update, Mark All Read deliberately initiated, retry after failure, counts and preference dirty drafts.
- [ ] Profile edit: unsaved-change dialog, interrupted save, no silent duplicate write, rejected and successful responses.
- [ ] Education/Health/Welfare/Employment: application forms, file uploads, duplicate prevention, interrupted submit, recovery, review and role boundaries.
- [ ] Finance/admin: donor/payment review, area scope, committee authorization, report totals, CSV and local Print to PDF on Android.
- [ ] Reports Center: all-time, 6-month, 12-month filters; restricted district/taluka users cannot see other areas.
- [ ] Health/Welfare case print: no external popup, correct case details, print/PDF and no private information leaking to new tabs.
- [ ] Offline or weak connection: already loaded data retained where designed; no automatic re-submission of write operations.
- [ ] Signed out/expired session: no private page content accessible via back navigation, downloaded file, cache, or direct URL.

**Never run synthetic Playwright fixtures against a real Supabase account.** They are local-only and do not prove real database RLS or authorized mutations.

## D. Hosting, backend and Android release blockers

- [ ] Verify intended canonical origin is `https://jwas.app` (or document any approved replacement). Confirm DNS, HTTPS, redirects, caching and manifest service worker behavior on that exact origin.
- [ ] Check `npx supabase migration list --linked` against the expected production project; confirm UX.6 and UX.9 migrations, including `20261104130000`, are applied. No unexpected pending migrations. Do not reset production DB.
- [ ] Test real **server-enforced RLS** for ordinary members, admins and area-restricted reviewers, especially confidential notifications, approvals, finance and reports.
- [ ] Open `https://jwas.app/.well-known/assetlinks.json`, confirm status 200 and valid JSON from the actual primary origin; verify package identity and **final signing certificate SHA-256**. The repository's historical defaults use `jasofficial.org` and `org.jasofficial.twa`: these are **not automatically correct for `jwas.app`**.
- [ ] Check Android package name, versionCode and signing cert for your final Play Store APK/AAB against the actual assetlinks.json (never publish a private signing key).
- [ ] Confirm PWA service-worker update behavior on a real Android device, including interrupted downloads and recovery, without losing form changes.
- [ ] Confirm privacy policy, account deletion route (if required), app support contact, data-safety declaration, screenshots and store listing are reviewed for Google Play requirements.
- [ ] Confirm rollback plan (previous Vercel deployment and safe database rollback plan), backups, error-monitoring/incident contact and post-release smoke tests.

## E. Release decision (fill in only after completing all gates)

- Automated validation: **NOT VERIFIED**
- Real-device verification: **NOT VERIFIED**
- Backend security verification: **NOT VERIFIED**
- HTTPS/Android signing verification: **NOT VERIFIED**
- Manual critical workflows: **NOT VERIFIED**
- Release disposition: **NO-GO until all required gates are confirmed**
- Reviewer / date / evidence links: ________________________

**Go / No-Go rule:** Any unresolved critical functional, security, payment, confidential-data or signing mismatch blocks release. This patch does not itself certify a Play Store submission.
