# R1.1 — Public donation intake

Scope: R1.1 only. R1.2 role isolation and R1.3 financial decision integrity have not started. These changes are local and uncommitted; nothing was pushed or deployed.

## Pre-change audit

- HEAD matched the requested baseline: `593d8632c8a752adff475b95b597ee879b50f025`.
- Initial working tree contained only the user's modified `supabase/config.toml`. It was not edited. The existing `Backup before syncing JAS UX.4-A-B-C` stash was preserved.
- `/donate` waited for login and an approved membership, uploaded receipts from the browser, then directly inserted into `finance_donations` with `.select('donation_no')`. Browser-provided membership snapshots were trusted. There was no public intake, persistent retry key, or submission rate limit.
- `finance-documents` was already private. Approved members could insert receipts under their user-ID folder and read those receipts. Finance managers had separate policies.
- The live local policy audit confirmed member-own donation SELECT and INSERT policies, area-based finance management policies, and finance storage policies. Management was broader than super_admin; changing this is explicitly deferred to R1.2.
- Existing donation numbering, audit triggers, notification triggers, member history, and donor leaderboard were inspected and retained. The leaderboard includes approved member-linked donations only.
- The local stack had migrations through `20261104130000`. No database reset was performed.

## Exact files affected

| File | Change |
| --- | --- |
| `.env.example` | Public Turnstile site key and server-only configuration documentation |
| `src/routes/donate.tsx` | Public form, donor/contact fields, optional member prefill, server submission, pending acknowledgement and persistent retry draft/key |
| `src/components/DonationSecurityCheck.tsx` | Turnstile widget with expiry/error reset and cleanup |
| `src/lib/donation-action.ts` | POST-only TanStack Start server action with server-only dynamic import |
| `src/lib/donation-intake.ts` | Strict field, amount and receipt byte validation |
| `src/lib/donation-submit.server.ts` | JWT verification, CAPTCHA, persistent budget, private upload and narrow RPC response |
| `src/lib/donation-intake.test.ts` | 19 validation regression cases |
| `src/lib/donation-local.integration.test.ts` | 8 real local Auth/PostgREST/Storage integration tests |
| `scripts/test-r1-local.mjs` | Local-only test runner; credentials stay in child-process environment |
| `e2e/public.spec.ts` | Public mobile form and actual lost-response/reload/retry tests |
| `supabase/migrations/20261105145312_public_donation_intake.sql` | Additive intake ledger/budgets, service-only RPCs, removal of direct member intake/upload policies |
| `scripts/rollback-r1-intake.sql` | Data-preserving emergency intake shutdown |
| `docs/JAS-R1.1-DELIVERY.md` | Audit, evidence, operation notes and limitations |

`supabase/config.toml` appears in git status only because of the pre-existing user change. No dependency or lockfile changes were made.

## Behavior and database changes

Visitors and authenticated users can submit donor name, email/phone, amount, purpose, payment method, transaction reference, optional receipt, and optional message. Login and membership approval are not prerequisites. Existing approved members retain their authoritative member association and leaderboard snapshots; these are resolved inside the database from the server-verified user ID.

The server accepts a strict allowlist and verifies amounts to two decimal places (0.01–100,000,000 PKR), bounded text, contact syntax, enums, UUID keys and a honeypot. Receipts are limited to 2 MiB with PDF/JPEG/PNG/WEBP MIME and signature checks. Original filenames are never used as storage paths.

Every intake inserts `pending`, with no approval/rejection metadata. The response contains only the donation reference and an intake-pending acknowledgement. A retry never discloses subsequent verification decisions. No public record lookup endpoint was added.

`donation_intake_keys` has a primary-key idempotency constraint and unique donation link. A transaction-scoped advisory lock serializes matching keys, and a fingerprint binds normalized fields, verified user ID and receipt bytes/type. Equal retries return the original reference; changed requests under the same key fail. The donation and ledger insert commit atomically. Different keys can still represent the same real-world transaction; broader finance deduplication is R1.3 scope.

Storage paths use `intake/<random UUID>/<SHA-256 fingerprint>` with `upsert:false`. An identical upload's 409 is accepted for recovery; content is not replaced. Anonymous users and ordinary members cannot list, read, sign, overwrite or delete these objects. Existing member-own historical receipts and finance manager policies remain unchanged for R1.2.

Turnstile must succeed with action `donation` and an explicitly allowed hostname before consuming a database rate budget. The persistent fixed-hour budget permits 10 attempts/contact and 200 total attempts/hour, including retries. The global cap cannot be evaded by rotating contacts or spoofing proxy headers. Invalid CAPTCHA requests do not exhaust the accepted-submission budget. Tables have RLS and no anon/authenticated privileges. Both new RPCs are SECURITY INVOKER, have an empty search path, and are executable only by service_role. Existing anon finance-table privileges are explicitly revoked.

The migration was executed directly against `supabase_db_jas-app-fresh` using local Docker psql, without resetting or deleting existing records. It has **not** been inserted into local migration history, applied to cloud, or pushed. Do not blindly reapply it to this already-tested local schema; reconcile local history as part of a separately reviewed release workflow.

## Validation

Use Node 24 (validated with installed v24.22.0). The default shell's Node 20 lacks the native WebSocket support required by the installed Supabase client.

| Check | Result |
| --- | --- |
| `npm run check` | Passed |
| `npm run build` | Passed through Playwright's production-build webServer command |
| `npm test -- --maxWorkers=2 --testTimeout=15000` | 53 files passed, 338 tests passed; 1 file / 8 integration tests skipped here and passed separately |
| `node scripts/test-r1-local.mjs` | 8 passed, real local Auth JWTs and live database/storage |
| `node scripts/test-r1-local.mjs --mobile` | 14 passed on the mobile project, including existing UX regression cases |
| Local security advisors | Six pre-existing mutable-search-path warnings; none for the new intake objects |
| `git diff --check` | Passed |
| Browser bundle secret scan | No local service-role key, service-role environment reference, or Turnstile secret reference in `.output/public` |

The first default Vitest run had two existing membership-directory tests exceed 5 seconds; the next two-worker run had one timeout. All assertions passed with a 15-second command-line timeout. No existing tests or test timeout configuration were modified. This is a qualification on the test results, not an unconditional default-command pass.

JWT integration coverage includes anonymous and approved-member submissions, authenticated nonmembers, invalid JWTs, invalid amounts, missing references, unsupported/spoofed receipts, concurrent duplicate submissions, discarded responses, changed-payload conflicts, denied direct RPCs/table access/member inserts, denied own/other donation updates, private storage restrictions, persistent contact throttling, and missing-CAPTCHA fail-closed behavior. Test-created users, donations and receipts are labeled local fixtures and deliberately retained; no financial records were deleted.

The mobile lost-response test sends the real server request, allows it to complete, discards its response, reloads the page and submits the restored draft under the same key. Database integration independently proves that repeated/concurrent requests create only one record. Existing synthetic sessions are used only by the pre-existing UX tests, not the new database authorization tests.

## Configuration and unresolved limitations

- No production readiness claim. R1.2 is still required: existing admin/finance_admin/area-management policies remain. R1.3 concurrency-safe approvals and full audit integrity remain out of scope.
- Deployment needs a real `VITE_DONATION_TURNSTILE_SITE_KEY`, server-only `DONATION_TURNSTILE_SECRET_KEY`, and `DONATION_ALLOWED_HOSTNAMES` (comma-separated exact hosts). These were documented, not configured externally. Real production CAPTCHA/hostname/CSP integration is not verified here. Missing configuration fails closed.
- `DONATION_LOCAL_TEST=true` is accepted only when the server's Supabase URL is loopback. The local runner sets this only for its child process; the example defaults to false.
- The receipt cap is validated after the framework parses multipart input. A hosting/proxy request-body limit and volumetric protection still need deployment verification; no Cloudflare/Vercel settings were changed.
- File signature validation is not malware scanning or full document decoding. Receipts remain private. A scanner and safe document-opening workflow remain deployment considerations.
- Storage and PostgreSQL are separate transactions. A failed/conflicting submission can leave an unreferenced private receipt. A successful retry reuses the content-addressed object. No automatic deletion job is included; reconcile references before any later cleanup.
- CAPTCHA plus contact/global caps limit submissions but do not prove a contact address belongs to the donor. Caps can affect legitimate busy periods and should be measured before deployment.
- A draft and random idempotency key are stored in tab-scoped sessionStorage after an attempted submit, cleared on success. After reload a donor must reselect the same receipt. Clearing browser storage loses retry continuity; the acknowledgement instructs donors to retain their reference.
- Submission acknowledgement is not a receipt certifying payment. Existing finance-management receipt generation and decisions are unchanged.

## Rollback

Prefer a disable-only rollback that preserves evidence and retry guarantees. The supplied `scripts/rollback-r1-intake.sql` revokes service_role execution of the two new RPCs and reloads PostgREST. It retains all donations, counters, keys, budgets, receipt objects and unrelated policies. It was reviewed but not executed. Show a donation maintenance message while intake is disabled.

Do not drop the idempotency ledger after accepting donations, reset the database, delete receipt objects, restore anonymous privileges, or restore direct member inserts as a shortcut. If reverting the UI to baseline, the old direct submission path will remain intentionally blocked until a separately validated replacement is provided. The rollback script includes the two grants needed to re-enable the validated server path.

For a source-only rollback before deployment, restore only the tracked R1.1 files from baseline and remove only the new files listed above after reviewing the diff. Do not use a broad reset/clean command, and do not touch `supabase/config.toml` or any stash. This source rollback does not undo the already-tested local schema; use the disable-only SQL separately.

References consulted: [Supabase changelog](https://supabase.com/changelog), [authentication documentation](https://supabase.com/docs/guides/functions/auth), and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control). The installed CLI remains v2.100.0; no v3 upgrade was performed.
