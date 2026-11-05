# JAS R1.1-r1 — Public Donation Intake Corrections

Status: implemented locally. No staging, commit, push, deployment, Supabase Cloud operation, database reset, or R1.2 work was performed. This patch is not approved for a standalone production deployment.

## Starting baseline and preservation

- Branch: `main`.
- Starting and ending HEAD: `9dc3e3c87e50b5431eda0d417f9f28d23b0e6ea9` (matches requested `9dc3e3c`).
- Initial Git status: only ` M supabase/config.toml`.
- Config SHA-256, verified unchanged: `6dc15b367a44cd23f0182a79749b7d96026110ee5c2d063b10a1465d838ba74f`.
- Preserved stash: `stash@{0}: On main: Backup before syncing JAS UX.4-A-B-C`; object `20603d13bd0db95fda45b713f6f00fcc46d69b21` verified unchanged.
- Local migration history contains exactly one `20261105145312` row before and after tests. The migration was **not reapplied**. Its previous local history reconciliation remains intact.

## Focused audit and corrections

| Finding | Correction and source |
| --- | --- |
| Public intake offered and accepted cash despite mandatory transfer references | `src/routes/donate.tsx` filters cash only from the public options. `src/lib/donation-intake.ts` uses an electronic-only public schema. Shared finance options, SQL constraints and existing cash records remain untouched. |
| Drafts had no age, structure validation or identity binding | `src/lib/donation-draft.ts` adds a strict versioned envelope, first-attempt timestamp, 24-hour expiry, UUID key and nullable account ID. Restore rejects malformed, expired, future-dated, legacy/unbound and other-account data. |
| Previous-account data could be reused | `src/routes/donate.tsx` initializes identity before restoring, subscribes to auth changes, clears donation state/storage on account changes, rechecks identity immediately before writing, and ignores results from an earlier identity. Member prefill cannot overwrite restored data or entered fields. |
| No explicit draft clearing | The visible **Clear Draft** button confirms that only browser recovery details are removed and that existing donations remain. Only `jas-donation-draft` and the legacy `jas-donation-key` are removed. |
| Reload did not know whether a receipt was required | The draft stores receipt SHA-256, MIME and size, never file contents or filename. Recovery requires the same bytes/type and compares normalized original fields before invoking the server. The database fingerprint remains authoritative if the browser is bypassed. |
| Generic exceptions mixed definite rejections and ambiguous outcomes | `src/lib/donation-result.ts` defines safe failure codes and messages. `src/lib/donation-submit.server.ts` distinguishes rejection before the finance RPC from an uncertain RPC outcome/conflict. `src/lib/donation-action.ts` returns an allowlisted result rather than serializing errors, stacks or database messages. |
| Retry could lose context | The same unresolved key survives reload and all failures. A definite rejection of a later request does not unlock an earlier ambiguous attempt. New keys are created only for a fresh form, acknowledged success, explicit clearing, expiry, or a disclosed identity change. No financial write is automatically replayed. |
| Duplicate multipart keys were collapsed silently | The server rejects duplicate parts before strict schema validation. Empty receipt files are now rejected; the existing signature/type checks and 2 MiB cap remain. |
| Local mobile runner could inherit an external browser target | `scripts/test-r1-local.mjs` removes inherited `E2E_BASE_URL` from the child environment. Existing loopback Supabase checks remain. |
| Extra blank lines at EOF | Removed from the integration test and historical migration. A byte comparison against HEAD after trimming EOF whitespace confirmed that all historical SQL statements are identical. |

The established architecture remains: TanStack POST server action, server-only Supabase client, validated user JWT, Turnstile, persistent rate-budget RPC, private Storage upload with `upsert:false`, and the original transaction/advisory-lock/idempotency-ledger RPC. Success returns only `ok:true`, the donation reference and `status:'pending'`; it never confirms payment verification or reveals subsequent finance decisions.

## Draft lifecycle and privacy

The new envelope contains only `version`, `createdAt`, `ownerId`, `idempotencyKey`, validated donor form fields, optional receipt digest/type/size, and `unresolved`. Its age starts at the first attempted submission and is not extended by retries. Expiry is checked on restore, before submission and while the form remains mounted.

Anonymous-to-authenticated, authenticated-to-anonymous and account-A-to-account-B transitions clear donor fields, receipt selection, CAPTCHA state and donation-specific storage. A response arriving after an identity transition is ignored. Same-account token refresh does not discard a valid draft. Account changes do not delete database records or automatically submit anything.

Legacy R1.1 drafts lack a trustworthy owner, timestamp and receipt binding, so they cannot be safely adopted. They are discarded with a visible warning to verify any previous submission before starting again. A valid new-format unexpired draft retains its exact key. Clear/expiry/account changes remove local recovery capability, not any donation already received; the UI explains this.

Tab-scoped sessionStorage still contains donor PII for recovery, up to 24 hours. It is not encrypted and cannot distinguish two people sharing the same anonymous browser session. Clear Draft is available for that case. Tokens, CAPTCHA values, credentials and receipt bytes are absent from the stored allowlist. If sessionStorage cannot save a draft, the form does not send a financial write.

## Validation results

Runtime: installed Node `v24.22.0` in WSL. No dependency upgrades or global test-configuration changes.

| Exact command | Actual result |
| --- | --- |
| `npm run check` | PASS, TypeScript exit 0 |
| `npx vitest run src/lib/donation-intake.test.ts src/lib/donation-draft.test.ts src/lib/donation-submit.server.test.ts src/routes/-donation-recovery.test.tsx --maxWorkers=2 --testTimeout=15000` | PASS, 4 files / 64 tests |
| `npm test -- --maxWorkers=2 --testTimeout=15000` | PASS, 56 files / 383 tests; 1 opt-in file / 10 local integration tests skipped here and passed separately |
| `node scripts/test-r1-local.mjs` | PASS, 10 real local Auth/PostgREST/Storage integration tests |
| `node scripts/test-r1-local.mjs --mobile` | PASS, 15 mobile Playwright tests, including existing UX regression tests and real local lost-response recovery with/without receipt |
| `npm run build` | PASS, standalone production build exit 0; generated `.output/nitro.json` |
| `git diff --check` | PASS |

The first focused run had one failure in the newly added server test: expected `unconfirmed`, received `captcha`. The test reused the same mocked Fetch `Response` twice, so its consumed JSON body caused the second CAPTCHA verification to fail. Fixed the test to return a fresh Response for each request. This was a new fixture issue, not a pre-existing application failure; the corrected 64-test focused run and full suite pass. No application anti-abuse behavior was weakened to make the test pass.

Coverage added/updated:

- Public cash rejected before any write; all four electronic methods accepted; references remain required; internal cash options and a new service-authorized internal cash fixture remain valid without modifying older cash records.
- Valid/expired/malformed/future/legacy draft restoration, Clear Draft, unrelated-storage preservation, three identity-transition cases, unchanged keys, no automatic replay, stale-response suppression, and receipt hash-only storage.
- Lost response after a database commit; reload with original key; missing/changed receipt and modified fields blocked; correct receipt/fields recover the same reference; concurrent duplicates remain one donation.
- Strict unknown-field and duplicate-part rejection, invalid amounts, invalid/empty/spoofed/oversized receipts, safe filenames, immutable uploads, invalid JWTs, denied public/member RPC and finance access, denied receipt listing/download/signing/replacement/deletion.
- Expired/duplicate CAPTCHA token responses, wrong action, non-exact hostname, missing configuration, provider exceptions and malformed provider responses fail closed. Persistent contact throttling remains tested against the local database. Provider-response cases are simulated unit tests, not live production Turnstile verification.
- Public error responses contain only allowlisted codes/outcomes/messages. Raw provider/database exceptions and stack text are not returned or displayed.

## Membership-directory timeout investigation

Before editing, ran `npx vitest run src/routes/-admin-membership-directory.test.tsx --maxWorkers=1` at the default timeout: all four tests passed. Total test time was 6.06 seconds; the two previously sensitive tests took 1.615 and 1.154 seconds. During the full two-worker run alongside the production-build/mobile verification, the same tests took 3.869 and 3.315 seconds and passed; the first test, which already has its own 15-second timeout, took 6.678 seconds.

Source inspection shows that these tests render 50-member mobile and desktop views and perform accessible DOM queries. The timing increase under concurrent load supports environment/CPU contention as the explanation for the earlier 5-second failures. No assertion failure or membership behavior regression was reproduced. The exact historical machine bottleneck was not profiled, so its root cause is not conclusively proven. No membership source, unrelated test, or global timeout setting was changed. The requested full-suite command explicitly supplies 15 seconds; this report does not claim a default full-suite run was performed or passed in this correction session.

## Local database safety and impact

Before integration execution, inspected the runner and tests. The runner reads credentials from `supabase status` in this repository, requires a loopback API URL, and does not print credentials. Verified the intended running containers `supabase_db_jas-app-fresh` and `supabase_kong_jas-app-fresh`; Kong exposes local API port `58321`. No cloud credentials were used.

The tests retain their clearly labeled fixture users, member, pending donations and receipts. No service-role cleanup deletes actual donations, members or receipts. The only deletion requests are negative authorization tests through anon/member clients against run-specific fixtures; failures/empty results and continued receipt existence are checked. Existing budget RPC maintenance remains unchanged. A new internal cash fixture is pending, not payment-confirmed.

No new migration is required. No SQL, RLS, finance role, area-management, storage-management, approval/rejection, authoritative audit or membership approval changes were made. The existing intake RPC is service-role-only and continues accepting the database's existing cash value for trusted internal compatibility; the public server entry point rejects cash before reaching it. Historical migration `20261105145312_public_donation_intake.sql` changed only by removal of one redundant final blank line.

## Upload-size deployment requirement

Installed `node_modules/@tanstack/start-server-core/src/server-functions-handler.ts:225` calls `await request.formData()` **before** the action validator/handler. The current application checks receipt size after this parse. It cannot be claimed to protect against oversized multipart bodies before allocation. A function-level validation change would not fix that ordering.

Deployment must enforce a streaming request-body limit before TanStack multipart parsing for the donation action's generated `POST /_serverFn/<action-id>` endpoint. Recommended maximum: **3 MiB (3,145,728 bytes)** total decoded request body, including multipart framing, allowing the 2 MiB receipt plus bounded fields. Enforce the limit for chunked requests and absent/false Content-Length, return HTTP 413 before invoking the action, and verify that this rejection produces no donation/storage write. Test a valid 2 MiB receipt, an over-limit Content-Length request and an over-limit chunked request. Do not impose this route-specific limit on unrelated upload workflows without checking their requirements. The client conservatively treats an opaque transport failure as unconfirmed and preserves the original key.

The installed server-function path has no route-specific streaming limiter configured in this patch. An upstream proxy or a separately validated pre-parser request middleware must provide it. [Vercel documents a 4.5 MB Function payload cap](https://vercel.com/docs/functions/limitations), which is a platform bound, not proof of the stricter donation limit or of any particular production deployment's configuration. No proxy, Cloudflare, Vercel or production settings were changed. No malware scanner was added; MIME/signature validation is not full document decoding or malware detection.

## Turnstile and rate-budget implications

Existing exact-hostname and `donation` action checks, server-only secret, missing-config failure, local-loopback-only test bypass and database budgets are preserved. [Turnstile tokens expire after five minutes and are single-use](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). The widget already clears expired/error tokens; each form attempt resets it, and safe failure feedback requests a fresh challenge while retaining the donation key.

The fixed UTC-hour budget remains **10 attempts per normalized contact / 200 total attempts**. Retries and post-CAPTCHA failures count. A donor can temporarily exhaust their own recovery allowance; they must wait up to one hour and retry the same draft, not create another key. High legitimate traffic or attackers who pass CAPTCHA can exhaust the global allowance. Contact fields are not proof of contact ownership. Fixed windows allow bursts near the hour boundary. No thresholds were increased or made configurable in this correction; any future capacity tuning requires traffic evidence and a separately reviewed additive migration/configuration design.

## Exact file list and diff summary

Modified (9 task files):

1. `e2e/public.spec.ts`
2. `scripts/test-r1-local.mjs`
3. `src/lib/donation-action.ts`
4. `src/lib/donation-intake.ts`
5. `src/lib/donation-intake.test.ts`
6. `src/lib/donation-local.integration.test.ts`
7. `src/lib/donation-submit.server.ts`
8. `src/routes/donate.tsx`
9. `supabase/migrations/20261105145312_public_donation_intake.sql` — EOF blank line only

Created (6 files):

1. `src/lib/donation-draft.ts`
2. `src/lib/donation-draft.test.ts`
3. `src/lib/donation-result.ts`
4. `src/lib/donation-submit.server.test.ts`
5. `src/routes/-donation-recovery.test.tsx`
6. `docs/JAS-R1.1-r1-DELIVERY.md`

The tracked task diff is **9 files, 313 insertions, 140 deletions**, plus the 6 new files listed above. It is limited to public donation validation, draft lifecycle, safe results/recovery, tests and this report. `supabase/config.toml` remains a separate **pre-existing user modification**, byte-for-byte unchanged. No shared finance schema/options, dependencies, membership modules or global test settings changed. Untracked new files are intentionally not staged, so ordinary `git diff --stat` does not count their contents.

## Remaining risks and R1.2 assessment

- Known finance-management authorization defects remain R1.2 release blockers. This patch does not restrict admin/finance_admin/district/taluka management to super_admin.
- R1.3 audit integrity and approval/rejection concurrency work remains out of scope.
- Live Turnstile hostname/CSP configuration, request-body controls and production runtime behavior are not production-verified by local fixtures.
- Storage and donation creation remain separate transactions. A failed or conflicting request may leave a private unreferenced upload; no destructive cleanup was introduced.
- Idempotency deduplicates the same key, not all real-world transfers under different keys. Explicit clearing/expiry discards recovery metadata, so the UI warns donors to verify earlier submissions before starting again.
- Receipt signature checks are not a malware scanner. Production document handling requires a separately reviewed workflow.

R1.1-r1 is suitable for review as the corrected, locally validated intake baseline. R1.2 can be planned/reviewed next only with user approval. Do **not** deploy R1.1-r1 separately to production.

Recommended commit message: `fix(donations): address R1.1 intake review findings`

## Final verification

- Standalone `npm run build` exited 0 and generated the Nitro production output. Non-fatal dependency `use client` directive and build timing warnings remain; no build error occurred.
- Scanned every `.output/public` file for the actual local service-role key and server-only Supabase/Turnstile secret environment references: no matches. Credentials were never printed or persisted by the test runner.
- Final config checksum, stash object and HEAD still match the recorded starting values. The reconciled migration history entry remains present exactly once.
- Final `git diff --check` passed. No files are staged. Nothing was committed, pushed or deployed.
