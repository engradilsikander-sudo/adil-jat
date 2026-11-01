# JAS Production Readiness + QA Phase 1

This checklist is for final verification before pushing/deploying major JAS app changes.

## 1. Required commands

Run from the project root:

```bash
npm run check
npm run build
bash scripts/verify-project.sh
```

If QA npm scripts were added:

```bash
npm run qa
```

## 2. Safe export rule

Never share a raw project zip. Use:

```bash
npm run safe-export
```

Then verify the archive:

```bash
npm run qa:archive -- exports/<archive-name>.zip
```

The archive must not contain:

- `.env.local`
- `.env*`
- `.git/`
- `node_modules/`
- `.output/`
- `supabase/.temp/`
- `supabase/snippets/`
- `backups/`
- logs or old zip files

## 3. Environment variables

Local `.env.local` may exist, but it must never be committed or exported.

Required local/server variables:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PUBLIC_SITE_URL=
```

Production Vercel should use the real public site URL:

```bash
VITE_PUBLIC_SITE_URL=https://your-domain.com
```

## 4. Smoke test routes

Public/member routes:

- `/`
- `/login`
- `/signup`
- `/register`
- `/dashboard`
- `/card`
- `/designation-card`
- `/donate`
- `/donors`
- `/notifications`
- `/verify/<memberNo>`
- `/verify/office-bearer/<officeBearerId>`

Public website routes:

- `/about`
- `/vision-mission`
- `/manifesto`
- `/constitution`
- `/cwc`
- `/committees`
- `/news`
- `/gallery`
- `/events`
- `/contact`

Admin routes:

- `/admin`
- `/admin/roles`
- `/admin/area-permissions`
- `/admin/audit-logs`
- `/admin/committees`
- `/admin/designations`
- `/admin/finance`
- `/admin/reports`
- `/admin/news`
- `/admin/cms`
- `/admin/programs/education`
- `/admin/programs/health`
- `/admin/programs/welfare`
- `/admin/programs/employment`

## 5. Membership QA

- Normal user can sign up and log in.
- User can submit membership form.
- Pending user cannot download active membership card.
- `membership_admin`, `admin`, and `super_admin` can approve/reject.
- Approved member gets member number and `/card` works.
- Public verify route only shows approved/verified records.
- CNIC/mobile are masked by default in admin list.

## 6. Area permissions QA

Rule: module role alone is not enough after Area RLS Phase 3.

- `education_admin` without `admin_area_permissions` shows no data / blocked message.
- `education_admin` with district `Umerkot` only sees Umerkot education records.
- `health_admin` with `All Sindh` sees all health records.
- `finance_admin` without Finance area permission is blocked.
- `super_admin` and `admin` retain All Sindh access.

## 7. Office bearer card QA

- Committee exists and is active.
- Approved member is assigned active designation.
- `/designation-card` shows premium Office Bearer Card.
- `/admin/members/<id>/designation-card` opens admin preview.
- QR opens `/verify/office-bearer/<officeBearerId>`.
- Front side has no QR if final QR placement is backside-only.
- Back side has QR, verification URL, terms, and authorized signature visible.
- PNG export does not crop bottom, signature, terms, or QR.

## 8. Audit logs QA

- `super_admin` can open `/admin/audit-logs`.
- Non-super-admin should be blocked from audit logs.
- Role changes create audit rows.
- Area permission changes create audit rows.
- Member approve/reject creates audit rows.
- Finance changes create audit rows.
- Audit export CSV works.

## 9. Supabase checks

Run in SQL Editor as needed:

```sql
select count(*) from public.audit_logs;
select * from public.admin_area_permissions order by created_at desc limit 20;
select * from public.user_roles order by created_at desc limit 20;
```

Also compare migrations:

```bash
npx supabase migration list
```

## 10. Deployment readiness

Before deploy:

- `npm run check` passes.
- `npm run build` passes.
- `git status` is clean.
- Supabase migrations are applied to cloud.
- Vercel env variables are set.
- Service role key has never been shared; if it was shared, rotate it.
- Test super admin login on production.
