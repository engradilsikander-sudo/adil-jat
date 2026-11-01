# JAS P0.2 — Database Access & Admin Reliability

Baseline: the uploaded `jas-app-fresh-analysis-20261101-085248.zip`, including P0.1 reviewer authorization/public-ID hardening.

## Behavior changes

- Explicit table privileges repair admin module access while keeping existing role/area RLS. New migrations refuse to run if expected module tables are absent or RLS is disabled.
- Public organization pages use an allowlisted RPC. Internal member/assignment UUIDs and internal committee notes are not exposed through that public directory. Existing committee URLs keep their committee identifier; office bearer keys use `JAS-OB-YYYY-XXXXXXXX`.
- Failed module reads show unavailable counters/retry controls. CMS load failures do not mark translations MISSING. Reports clear stale results after a failed refresh.
- Program, finance, reporting, organization and designation lists fetch all count-checked pages with unique ordering. Totals/exports no longer silently stop at the API row cap. These reads are not a transaction snapshot; changing counts fail closed and request refresh.
- Filter rows wrap to the content width; Health list payload and CSV are operational summaries. Clinical fields remain in the existing authorized detail workflow.
- Restored INSERT access cannot create pre-approved program applications or pre-verified documents; financial decisions require approve permission in the current/destination area.
- Plain PostgREST errors are normalized; SQL hints are not displayed as repair instructions.
- Restores a sanitized `.env.example` and adds regression coverage.

## Membership fee: PKR 500

New membership applications require a manual payment receipt for PKR 500, tax/processing charges zero. Registration and its pending fee record are saved atomically by `submit_membership_application_500`. Retrying reuses the same member/payment identity. Receipt upload does not mark a payment paid.

The final registration step displays the existing configured bank/payment details and QR asset. No automatic checkout, charge, renewal, or recurring fee is introduced. Receipt file bytes are stored privately before the SQL transaction; a failed transaction may leave an unused uploaded object, which is not a payment record.

The admin member detail page restores Payment Receipt & Verification. Reviewer actions use a service-role-only RPC that checks the verified reviewer's membership role and target area, validates actual storage receipt metadata, and writes through the existing audit trigger in the same transaction. Paid/waived status is required before new membership approval. Waiver/refund actions require an admin note. Approved membership fee status is locked against downgrade.

Existing applications are grandfathered via `membership_fee_required=false`. Existing payment amounts are never rewritten. Old free applications are not automatically invoiced when edited. An existing pending fee (for example PKR 600) retains its original amount when its receipt is replaced.

Private receipt objects are immutable to applicants after upload; replacement evidence receives a new path. Scoped reviewers can upload evidence for members in their review area. Anonymous users cannot read membership payments/receipts. Ordinary members cannot verify fees or change canonical amounts.

## Compatibility corrections

The baseline used `.inputValidator(...)`, but its installed lockfile's TanStack server-function builder exposes `.validator(...)`. Calls and test mocks now use that API. The public verification route type also matches P0.1's UUID-free response. P0.1's reviewer and verification protections remain in place. Saved Urdu/Sindhi preferences are applied in a transition after hydration to keep streamed server markup consistent with the browser.

## Files and database deployment

Two new migrations are included:

1. `20261101090000_jas_p02_database_access.sql`
2. `20261101091000_jas_p02_membership_fee_500.sql`

Do not edit old migrations or reset any database. The patch's apply script only copies source files and saves a backup. It never runs a migration or deploys a site.

After confirming the intended linked Supabase project, inspect `npx supabase migration list` and `npx supabase db push --dry-run`. Review every pending migration. Apply database migrations deliberately before deploying the new frontend/server. Run `supabase/qa/jas-p02-preflight.sql` against the selected project after migration.

`supabase/tests/jas-p02-access-and-fees.sql` is a rollback-only LOCAL/STAGING fixture test. Do not use production for integration fixture tests. `qa-runtime` provides an isolated PostgreSQL/WASM harness with Supabase platform schema stand-ins; it never opens a hosted database connection.

## Validation commands

```bash
npm ci
npm run check
npm test
npm run push:check
npm run email:templates:check
npm run build

# Optional isolated database integration tests (no Docker/hosted connection).
npm ci --prefix qa-runtime --ignore-scripts --no-audit --no-fund
npm --prefix qa-runtime test

# Browser tests against a locally running app with public Supabase env configured.
npx playwright install chromium
npm run dev
# In another terminal:
npx playwright test e2e/admin-reliability.spec.ts --project=desktop
```

Browser tests intercept auth/REST with synthetic fixtures; they establish control layout and client rendering, not live Supabase account behavior. Existing staging-only membership E2E is not claimed as passed. Complete live registration, receipt upload, verification, approval and card issuance on staging before production rollout.
