# Combined release operations

This patch targets the September 9 13:56 source plus the previously installed QR protection patch. Source hashes are checked before changing anything. An automatic backup supports rollback.

## Release order

1. Run npm ci, then npm run release:check.
2. On staging run npx supabase db push --dry-run, inspect the migration list, then npx supabase db push.
3. Test active, expired and revoked office-bearer cards. Only approved members with active public assignments should verify. Ambiguous short IDs fail closed.
4. Check admin Notifications: email counts load, failed/dead retries queue, sent messages cannot retry. Existing push monitoring remains available. Delivery still requires configured workers/providers.
5. Apply the same migration to the intended production project before deploying the application.

The new migration requires 20260909190000_public_verification_budget.sql. Verification fails closed when its RPC is absent.

## Verification limits and cleanup

Vercel requests use its platform-controlled x-vercel-forwarded-for header. Other hosts use a shared fallback until a trusted proxy integration is supplied. Per-minute limits: client 60, service 300, individual card 20. Client IPs are HMAC-hashed with a daily salt; shared networks share a limit. Header reference: https://vercel.com/docs/headers/request-headers

Schedule `select public.cleanup_verification_budgets();` daily in Supabase Cron with a privileged database job. Without this schedule expired client counters remain stored. The function deletes entries older than one day. Do not expose it to public clients.

## Browser tests

Run the app in another terminal with npm run dev, then:

```bash
npx playwright install chromium
E2E_BASE_URL=http://localhost:3000 npm run test:e2e -- e2e/public.spec.ts
```

The full journey test creates and deletes one test member. Use an isolated staging database, a pre-created staging admin and an email sink. Disable external notifications in staging. Set these shell variables securely, never in source control:

- E2E_BASE_URL and E2E_STAGING_ORIGIN: staging app URL origin
- E2E_SUPABASE_URL and E2E_SERVICE_ROLE_KEY: matching staging database
- E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD: staging admin
- E2E_ALLOW_MUTATIONS=STAGING_ONLY

Run npm run test:e2e -- e2e/membership.spec.ts. The app must use that same staging database. The test confirms its new signup using the admin API, checks pending/approved status, downloads a PNG and opens public verification in a fresh session. It does not decode the PNG QR; also scan the downloaded card with a phone. Trace, screenshots and video are disabled. On failure check cleanup of test users, photos and related notification/audit records.

## Database and storage recovery drill

Keep backups outside the repository, restrict access, encrypt off-device copies and set retention. Pause writes while capturing database and storage for a consistent recovery point. Storage backup loads each object into memory; use a machine with capacity for the largest file.

Use your Supabase dashboard database backup/PITR workflow and prove a restore into an isolated project. Verify Auth users, application tables, private schema, grants, RLS and functions. A public-schema SQL dump is not a full Auth recovery plan. Database backups do not contain Storage object bytes. Preserve provider settings and secrets separately in your approved secret store.

Export SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY securely, then:

```bash
# Parent exists; destination must not already exist.
npm run backup:storage -- /home/noman/backups/jas-storage-YYYYMMDD
npm run backup:verify -- /home/noman/backups/jas-storage-YYYYMMDD
```

The manifest records buckets, paths, sizes and SHA-256 hashes. Offline verification checks every saved object, but does not prove database recovery. Incomplete backups have no final manifest and cannot restore.

For a rehearsal, change the Supabase variables to a DIFFERENT isolated recovery project. Set JAS_RESTORE_TARGET to that target URL origin:

```bash
npm run restore:storage -- /home/noman/backups/jas-storage-YYYYMMDD
```

Restore refuses the original project and nonempty target buckets and never overwrites objects. Review existing empty bucket settings; the script does not change them. Recreate policies through database recovery. After a partial failure use a fresh empty target to retry. Back up the recovered storage and compare path/hash pairs, then verify sign-in, member counts, private photo access, approval and QR. Record the drill before treating backups as recovery-ready.

## Performance

npm run release:check creates release-reports/assets.json with raw/gzip sizes. This is not a page-speed score. Measure the deployed homepage, dashboard and card with the same browser/network profile and record LCP, CLS, interaction latency and download time. Existing large vendor bundles may need separate targeted optimization.

## Rollback

The installer prints an exact --rollback command and refuses to overwrite later edits. Run npm ci and checks after rollback. Source rollback does not revert applied database migrations. The new RPCs are additive and may remain; never remove applied migration history.

Database assertions are included in supabase/tests/combined-release.sql. Run with psql against isolated staging as database owner; they check limits and RPC grants inside a rolled-back transaction. These do not replace testing real appointment records and admin roles.
