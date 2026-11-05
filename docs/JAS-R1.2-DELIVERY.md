# JAS R1.2 — Super Admin Finance Isolation

Starting baseline: main, a5646428f54c3b256ee0714ed1e600932f319e8d. R1.1-r1 is committed. Initial status: only intentional supabase/config.toml modification; no staged files. Stash preserved. Local Docker project jas-app-fresh confirmed; 20261105145312 is in its migration ledger.

## Pre-change access-path inventory

- Finance donations: area-helper SELECT/INSERT/UPDATE plus donor-own SELECT. Expenses: area-helper SELECT/INSERT/UPDATE. Audit: broad finance helper INSERT and area/global admin SELECT. No finance table DELETE grant for authenticated clients.
- current_user_can_manage_finance delegates to generic finance-area view; current_user_can_access_finance_area delegates to app_private.user_can_access_area_module, whose admin/super_admin bypass and all/finance scoped permissions authorize Finance.
- Shared area helper also serves membership/programs/reports: preserve its exact non-finance branches. Role assignment and area assignment are already super-admin managed; do not alter those unrelated authorization policies.
- All storage.objects policies inspected: other bucket policies have literal non-finance bucket predicates; finance upload/update use generic module rights and finance SELECT accepts module rights OR linked-row area rights. Historical own SELECT checks only the user folder, without linking to a donation.
- finance-documents is private. New intake paths use intake/UUID/hash; old member evidence uses user-ID/donations/name. No anonymous storage grants should be added.
- Public submit_public_donation and consume_donation_intake_budget are SECURITY INVOKER, service-role-only RPCs. Service role bypasses RLS, while numbered donation/audit/notification triggers retain their existing definer execution. Keep these grants and implementations unchanged.
- get_donor_leaderboard is SECURITY DEFINER with approved-member or finance-management gating; retain approved-member aggregate behavior. Finance eligibility will become super-admin-only.
- General audit_logs and get_audit_logs already require super_admin. Finance-specific audit helper is broad and requires replacement. Label/redaction functions return no stored ledger data.
- jas_reports_center_summary is SECURITY INVOKER, but donor-own RLS alone could still contribute personal donations to a non-super report; explicitly gate finance source CTEs. Preserve membership fees and authorized program approved_amount metrics, which belong to existing non-finance workflows.
- Finance route has broad role checks, redundant area checks and no auth-change invalidation. Mutations recheck that helper; every database mutation must remain RLS-protected.
- Admin sidebar is static; header account menu, dashboard actions and AdminProgramShortcuts also expose finance links. Remove only finance visibility for non-super roles.
- Reports page retains cached responses during some refresh failures; add authorization/account invalidation to finance-containing views.
- No other ledger-reading views or RPCs found in the public/app_private function-source scan. Program summaries read program_applications, not finance ledgers. Donor-own history and notifications are intentionally separate from finance management.

## Implemented database boundary

Migration `20261105210216_super_admin_finance_isolation.sql` was created with `npx supabase migration new super_admin_finance_isolation`, then applied once with `npx supabase migration up --local`. It completed transactionally, and the actual ledger contains exactly one row for version `20261105210216`. No history repair, reset, historical migration edit or cloud operation occurred.

`app_private.finance_super_admin()` is the only new SECURITY DEFINER helper. It has an empty search_path and reads exact `super_admin` membership in `public.user_roles` for `auth.uid()`. Definer execution is needed to avoid role-table RLS recursion; it accepts no caller identity, reads no financial data and executes no dynamic SQL. PUBLIC/anon execution is revoked; authenticated/service_role execution is explicit. The three public Finance wrappers and the linked-document helper are SECURITY INVOKER with empty search_path. The shared area helper retains its existing definer/grants and every non-Finance branch; its Finance branch requires the authenticated identity and the new Super Admin predicate. Public schema CREATE is denied to anon/authenticated.

All prior policies on the four Finance tables were removed before creating the complete replacement set, preventing permissive-policy OR bypasses:

| Table | Authenticated SQL grants | Effective RLS |
|---|---|---|
| finance_donations | SELECT, INSERT, UPDATE | Super Admin management; donor_user_id = auth.uid() read only |
| finance_expenses | SELECT, INSERT, UPDATE | Super Admin only |
| finance_audit_logs | SELECT, INSERT | Super Admin only |
| finance_donation_counters | SELECT | Super Admin only |

PUBLIC/anon grants are removed. Client DELETE/TRUNCATE remains unavailable, including to Super Admin; existing ledger/audit records are preserved. UPDATE has both USING and WITH CHECK. Service-role grants/bypass and service-only intake RPCs remain unchanged. Approval triggers continue to call the now-restricted Finance helper. Role/area assignment records are preserved; Finance area grants no longer confer management access.

## Storage

All policies on storage.objects were inspected, including policies named for other modules. The unrelated policies restrict literal other bucket IDs. Every policy whose expression referenced finance-documents was replaced. Four permissive policies authorize SELECT/INSERT/UPDATE/DELETE, with four corresponding restrictive guards to prevent another authenticated permissive policy from opening this bucket. The bucket remains private.

Super Admin can list/download/sign/upload/upsert/copy/move/delete authorized Finance objects. Historical own reads require BOTH `<auth.uid()>/donations/…` and an actual finance_donations row owned by that user whose receipt_file_path exactly matches the object. An unlinked own-folder object is denied. Owners cannot upload, replace, copy, move or delete evidence. Intake paths remain service-created and private. No direct anonymous Storage capability was added.

Already-issued signed URLs are bearer links and cannot be retroactively recalled by RLS; they remain usable until their existing expiry. Revoked users cannot create new signed URLs. Production operators should account for the configured short link lifetime when investigating prior exposure.

## Frontend and reports

Finance mounts only after the database permission check succeeds. Account/session events immediately clear the gate and unmount data/forms; stale in-flight responses belong to the old unmounted screen. Focus/visibility changes revalidate, and visible pages poll every five seconds for database role revocation. Database authorization applies immediately to each operation; UI revocation detection takes up to the poll interval plus response time. Failed checks close access. Polls do not overlap a slow pending check. Finance loads clear previous rows and mutations retain their role precheck plus authoritative database RLS.

Sidebar, dashboard quick actions, the reusable program shortcuts, and the account-menu builder restrict Finance links. Other module permission rules are preserved. Denied/loading/retry copy uses the existing English/Urdu/Sindhi mechanism.

The SECURITY INVOKER Reports RPC explicitly filters both donation and expense source CTEs with the Finance predicate, even when an operator has donor-own SELECT access. `financeVisible` declares the projection's availability. Non-Super operators keep authorized membership/program/reports metrics, but receive no donation/expense rows or amounts in totals, districts, monthly summaries or recent activity. Membership fees and program approved_amount belong to separate existing workflows and remain scoped normally. The UI hides Finance metrics/section/export for denied operators. Account/role changes remount Reports; refresh errors clear cached reports and exports.

## Real local JWT verification

Tests create unique `r12-* @example.test` Auth fixtures and clearly labeled LOCAL R1.2 records against loopback only. No real member/donation/payment/expense record was deleted. Finance DELETE tests use nonexistent IDs and assert the missing grant; only an explicitly created scratch Storage copy is deleted. Fixture users/financial rows remain for reproducibility. Role deletion is scoped to generated fixture users for revocation tests.

| Actor | Finance tables/helpers | Private Storage management | Finance report projection | Public intake |
|---|---|---|---|---|
| Super Admin | ALLOW | ALLOW | ALLOW | ALLOW |
| Ordinary admin | DENY | DENY | Redacted | ALLOW |
| finance_admin | DENY | DENY | Redacted | ALLOW |
| District all-module viewer/reviewer/approver | DENY | DENY | Redacted | ALLOW |
| Taluka Finance viewer/reviewer/approver | DENY | DENY | Redacted | ALLOW |
| education_admin | DENY | DENY | Redacted | ALLOW |
| Approved member | Own donation SELECT only | Linked historical own read/sign only | Redacted | ALLOW |
| Different approved member | Own-only boundary | Other owner's evidence denied | Redacted | ALLOW |
| Authenticated nonmember | DENY management | DENY | Redacted | ALLOW |
| Anonymous | DENY | DENY | RPC denied | ALLOW |
| Multiple roles with super_admin | ALLOW | ALLOW | ALLOW | ALLOW |
| Multiple roles without super_admin | DENY | DENY | Redacted | ALLOW |
| Revoked Super Admin, same JWT | DENY | DENY | Redacted with independent Reports grant | ALLOW |

Every authenticated fixture has spoofed user_metadata.role = super_admin; this never grants access. Matrix assertions cover direct known-ID SELECT/INSERT/UPDATE and missing DELETE privileges, Finance Audit SELECT/INSERT, general audit RPC denial, helpers including generic module access, Storage LIST/download/sign/upload/upsert/copy/move/delete and direct report RPCs. Super Admin internal cash and approval/rejection/payment transitions pass; report approved-donation totals match service-read stored rows. The historical own-receipt test denies arbitrary own-folder evidence and another member's receipt and retains the member leaderboard.

## Validation

Final command results are recorded below after completion.

Local catalog verification passed: four RLS-enabled tables, no anonymous grants, no client DELETE/TRUNCATE, exact Finance helper ACLs, eight storage policies including four restrictive guards, private bucket, service-only SECURITY INVOKER intake functions and invoker report/document boundaries. No ledger-reading public/app_private views were found. Stored-function references were reviewed: report aggregate, leaderboard, intake, approval trigger, audit action label and linked-document helper.

`npx supabase db lint --local --schema public,app_private --level warning`: **No schema errors found**. This installed CLI does not expose the hosted Security Advisor suite locally. No hosted advisor was invoked because cloud access is outside this request. Catalog/RLS/grant checks and real JWT assertions provide the local security evidence; this is not a claim that hosted advisors are clean.

## Remaining R1.3 work

Client-authored Super Admin Finance activity remains compatible. R1.2 prevents non-Super fabrication but does not implement authoritative database-generated Finance events, transactional event consistency, exactly-once decision events or concurrency-safe approval/rejection. Those remain R1.3 work. Generic audit triggers and all historical audit records remain intact.

## Deployment prerequisites and fail-closed recovery

No commit, push, cloud migration or Vercel deployment was performed. This is local validation, not a production-readiness certification. Before a separately authorized deployment: review this diff and migration against the target's effective grants/policies, take a verified backup, verify the intended Super Admin accounts, apply the forward migration via normal deployment history, deploy compatible UI, and run real target acceptance tests with live Turnstile hostname/action configuration and server-only credentials. Confirm reports/receipts and unrelated module access with least-privilege accounts. Never enable the local CAPTCHA bypass in production.

If the UI fails, retain the R1.2 database/storage restrictions and disable Finance management navigation/routes temporarily. Restore a compatible application build or deploy a corrective forward migration after diagnosis; do not restore the broad R1.1 Finance policies, disable RLS, make the bucket public, reset the database or rewrite migration history. Public intake should remain on its existing service-only boundary. If intake itself fails, suspend new submissions while preserving pending records, idempotency keys and uploaded receipts; correct that service boundary rather than granting public ledger access. Verify recovery using anonymous/member electronic submissions with private receipts, repeated identical-key response recovery, pending-only acknowledgements, rejection of public cash and changed-receipt reuse, and non-Super denial checks. Never delete ledger evidence as rollback.

Recommended commit message: `fix(finance): isolate finance management to super admin`


## Exact changed/new files

- `docs/JAS-R1.2-DELIVERY.md`
- `e2e/finance-isolation.spec.ts`
- `e2e/fixtures/mobile-session.ts`
- `scripts/test-r1-local.mjs`
- `src/components/admin/AdminProgramShortcuts.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/config/navigation.tsx`
- `src/lib/admin-management-i18n.ts`
- `src/lib/area-permissions.ts`
- `src/lib/finance-local.integration.test.ts`
- `src/lib/reports-aggregate.test.ts`
- `src/lib/reports.ts`
- `src/lib/use-finance-access.test.tsx`
- `src/lib/use-finance-access.ts`
- `src/routes/-admin-membership-directory.test.tsx`
- `src/routes/-admin-reliability.test.tsx`
- `src/routes/-reports-mobile-usability.test.tsx`
- `src/routes/admin.tsx`
- `src/routes/admin/finance.tsx`
- `src/routes/admin/reports.tsx`
- `supabase/migrations/20261105210216_super_admin_finance_isolation.sql`

`supabase/config.toml` is still the intentional pre-existing modification, not an R1.2 edit. No file is staged. HEAD remains `a5646428f54c3b256ee0714ed1e600932f319e8d` on main. The stash `Backup before syncing JAS UX.4-A-B-C` retains object `20603d13bd0db95fda45b713f6f00fcc46d69b21`.

Baseline SHA-256 verification passed for both protected files: config `6dc15b367a44cd23f0182a79749b7d96026110ee5c2d063b10a1465d838ba74f`, .env.local `7bed9c087ec8d795c46b4ab7fcd6fc34a514d160265f76d2a3b1171b0f668017`. Values/credentials are not logged. All 221 pre-existing donation, expense, Finance audit and general audit row hashes still match the pre-migration snapshot.
