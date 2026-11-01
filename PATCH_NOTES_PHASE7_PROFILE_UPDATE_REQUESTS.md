# Phase 7 — Member Profile Update Requests

This patch adds a controlled workflow for approved members to request corrections to their live profile and digital membership card data.

## Member workflow

- New route: `/profile-update`
- Approved members can open the page from Dashboard → Quick Actions.
- The form is prefilled with the current approved member record.
- Only changed values are submitted.
- Supported fields:
  - full name and father name
  - CNIC and mobile
  - district and taluka
  - address, profession, caste/branch
  - date of birth, gender, education, blood group
  - emergency contact details
  - optional replacement photo
- A member can have only one pending request at a time.
- A pending request can be cancelled by its owner.
- Request history shows pending, approved, rejected, and cancelled records.
- English, Urdu, and Sindhi member-facing copy is included.

## Admin workflow

- New route: `/admin/profile-update-requests`
- Added under the Membership section of the Admin sidebar.
- Available to `admin`, `super_admin`, and `membership_admin` roles.
- Search and status filters are included.
- Reviewers can compare current and requested values before deciding.
- CNIC and mobile values are masked by default with an explicit reveal control.
- Rejection requires an admin reason.
- Approval updates the live `members` record transactionally.
- Approval and rejection notify the member and link back to `/profile-update`.

## Database and security

Migration: `20260710213000_profile_update_requests.sql`

- Adds `public.profile_update_requests`.
- Adds a partial unique index enforcing one pending request per member.
- Enables and forces RLS.
- Blocks all direct client inserts, updates, and deletes.
- Adds security-definer RPCs:
  - `submit_profile_update_request`
  - `cancel_profile_update_request`
  - `review_profile_update_request`
- Members may submit requests only for their own approved membership.
- Membership reviewers are checked against the member's source area.
- Moving a member to another area requires approval access to both source and target areas.
- Rejection requires source-area review access but does not require target-area access.
- Approval uses stale-data protection so an old request cannot overwrite a newer admin/member change.
- CNIC uniqueness is checked during submission and again during approval.
- Replacement photos are restricted to a dedicated user/request UUID path.
- Photo uploads are validated as JPG, PNG, or WebP with a 2 MB client limit.
- Cancelled/rejected replacement photos and replaced old photos are cleaned up on a best-effort basis.
- Approval/rejection and member-row changes are transactionally audited.
- Recursive audit redaction protects CNIC, mobile, address, date of birth, emergency details, member notes, and storage paths.

## Audit and QA

- Profile update requests are available as a filter in Admin → Audit Logs.
- Added `supabase/qa/profile-update-requests-smoke-tests.sql` for read-only production checks.
- Added profile-update helper tests, including invalid calendar-date handling.
- Production verification now checks both new routes, the migration, and the helper tests.

## Apply

```bash
cd ~/projects/jas-app
unzip -o /mnt/c/Users/*/Downloads/jas-phase7-member-profile-update-requests-patch.zip -d .
```

## Apply database migration

Local Supabase:

```bash
npx supabase migration up --local
```

Linked cloud project:

```bash
npx supabase db push --dry-run
npx supabase db push
```

## Validate

```bash
npm run check
npm test
npm run build
```

Optional complete QA:

```bash
npm run qa:core
```

## Production smoke test

1. Log in as an approved member.
2. Open Dashboard → Request Profile Update.
3. Change one field and optionally upload a replacement photo.
4. Submit the request and confirm a second pending request is blocked.
5. Log in as a membership reviewer with matching area access.
6. Open Admin → Profile Update Requests.
7. Compare values, approve or reject, and confirm the member receives a notification.
8. For approval, verify Dashboard, Digital Card, and public verification reflect the new data.
9. Open Admin → Audit Logs and filter by Profile Update Requests.
10. Run `supabase/qa/profile-update-requests-smoke-tests.sql` in the SQL Editor.
