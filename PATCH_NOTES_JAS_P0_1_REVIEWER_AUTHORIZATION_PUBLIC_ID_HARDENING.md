# JAS P0.1 — Reviewer Authorization & Public-ID Hardening

## Scope

This stabilization patch closes the critical cross-area member-edit authorization gap without redesigning the existing TanStack Start + Supabase architecture.

## Security changes

- Replaces the service-role direct `members.update(...)` path in `updateMemberApplicationAction` with the service-role-only `update_member_application_as_reviewer(...)` RPC.
- The RPC requires an `admin`, `super_admin`, or `membership_admin` reviewer and verifies membership `review` access for both:
  - the member's current district/taluka; and
  - the requested destination district/taluka.
- Member photo paths must remain under the target member's own `user_id/` storage prefix.
- Member edit fields are explicitly allowlisted; status, member number, review metadata, ownership, and other protected fields cannot be supplied through the RPC.
- The existing database audit trigger now accepts a transaction-local, pre-authorized reviewer actor so the member update and its audit event stay in the same transaction.
- The old manual audit write for this member-edit action is removed, avoiding a second application-level audit entry.

## Public-ID hardening

- Public member verification no longer returns the internal `members.id` UUID.
- Public designation-holder results no longer return raw assignment/member/committee UUID columns. A card-safe `public_key` (`JAS-OB-YYYY-XXXXXXXX`) is returned instead.
- Public office-bearer verification JSON no longer emits raw assignment/member/committee UUIDs.
- The server action additionally allowlists office-bearer verification fields, so stale database responses cannot leak old UUID fields through the app response.

## Files

- `src/lib/admin/actions.ts`
- `src/lib/admin/actions.test.ts`
- `src/lib/verify/actions.ts`
- `src/lib/verify/actions.test.ts`
- `src/lib/verify/office-bearer.ts`
- `src/lib/verify/office-bearer.test.ts`
- `src/lib/designation-holders.ts`
- `src/lib/committees-public.ts`
- `src/routes/designation-holders.tsx`
- `src/routes/verify/office-bearer/$officeBearerId.tsx`
- `src/lib/supabase/database.types.ts`
- `supabase/migrations/20260914050000_reviewer_authorization_public_id_hardening.sql`
- `supabase/qa/reviewer-authorization-public-id-hardening-smoke.sql`
- `supabase/tests/reviewer-authorization-public-id-hardening.sql`

## Database deployment

```bash
npx supabase migration list
npx supabase db push
```

Then run the read-only smoke test in the Supabase SQL Editor:

`supabase/qa/reviewer-authorization-public-id-hardening-smoke.sql`

Run the transactional authorization integration test on local/staging Supabase:

`supabase/tests/reviewer-authorization-public-id-hardening.sql`

## Local QA

```bash
npm ci
npm run check
npm test
npm run build
```

Recommended focused tests:

```bash
npx vitest run \
  src/lib/admin/actions.test.ts \
  src/lib/admin/member-action-validation.test.ts \
  src/lib/verify/actions.test.ts \
  src/lib/verify/office-bearer.test.ts
```

## Manual security checks

1. A `membership_admin` scoped to District A can edit a member in District A.
2. The same reviewer cannot edit a member whose current area is District B.
3. The reviewer cannot move a District A member into unauthorized District B.
4. A reviewer cannot submit another member's photo storage path.
5. Public `/verify/<member-no>` response contains no internal member UUID.
6. Public designation-holder results contain `public_key` and no assignment/member/committee UUID fields.
7. Public office-bearer verification contains `office_bearer_id` and no raw internal UUID fields.

## Git

```bash
git status
git add \
  PATCH_NOTES_JAS_P0_1_REVIEWER_AUTHORIZATION_PUBLIC_ID_HARDENING.md \
  src/lib/admin/actions.ts \
  src/lib/admin/actions.test.ts \
  src/lib/committees-public.ts \
  src/lib/designation-holders.ts \
  src/lib/supabase/database.types.ts \
  src/lib/verify/actions.ts \
  src/lib/verify/actions.test.ts \
  src/lib/verify/office-bearer.ts \
  src/lib/verify/office-bearer.test.ts \
  src/routes/designation-holders.tsx \
  'src/routes/verify/office-bearer/$officeBearerId.tsx' \
  supabase/migrations/20260914050000_reviewer_authorization_public_id_hardening.sql \
  supabase/qa/reviewer-authorization-public-id-hardening-smoke.sql \
  supabase/tests/reviewer-authorization-public-id-hardening.sql

git commit -m "fix: harden reviewer authorization and public ids"
git push origin main
```
