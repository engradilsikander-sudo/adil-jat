# Jatt Alliance Sindh (JAS) Web App

A member-verified web platform for Jatt Alliance Sindh. The app combines digital membership registration, admin approval, QR-based member cards, program applications, finance tracking, donations, donor leaderboard, employment support, and member notifications.

## Current modules

- Public landing page with Programs, Donate and Donors entry points
- Membership registration, approval, rejection and QR verification
- Digital membership card front/back and admin card preview
- Unified member dashboard and in-app notifications
- Education program applications and admin review
- Health assistance cases with restricted medical review
- Welfare case management and close reports
- Employment program / CV database
- Donation submission and member-only donor leaderboard
- Admin finance dashboard for donations, expenses and audit logs
- Role-based admin entry points for membership, education, health, welfare, employment and finance

## Tech stack

- React + TypeScript
- TanStack Start / TanStack Router
- Supabase Auth, Postgres, Storage and RLS
- Tailwind CSS
- Vite

## Environment setup

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Client-safe values
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PUBLIC_SITE_URL=http://localhost:3000
VITE_SITE_URL=http://localhost:3000
VITE_VAPID_PUBLIC_KEY=

# Server-only values
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Supabase Edge Function secrets only, not Vercel frontend env
# VAPID_PRIVATE_KEY=...
# VAPID_SUBJECT=mailto:support@jasofficial.org
```

Important: never commit or share `.env`, `.env.local`, or any file containing real secrets. The service-role key is server-only. `SUPABASE_URL` should normally match `VITE_SUPABASE_URL`, but it is read only by server-side admin actions. Never create `VITE_SUPABASE_SERVICE_ROLE_KEY`, `VITE_VAPID_PRIVATE_KEY`, or any other `VITE_` private secret.

For Web Push Edge Functions, set private secrets in Supabase rather than client env:

```bash
npx supabase secrets set VAPID_PUBLIC_KEY="..."
npx supabase secrets set VAPID_PRIVATE_KEY="..."
npx supabase secrets set VAPID_SUBJECT="mailto:support@jasofficial.org"
```

Brevo SMTP credentials for password reset emails belong in Supabase Cloud Auth SMTP settings, not in Vercel frontend env. The browser calls Supabase Auth; Supabase sends recovery emails through Brevo.

Run local safety checks before deployment:

```bash
npm run env:check
npm run lock:check
```

If an old local env file contains `VITE_VAPID_PRIVATE_KEY`, fix it with:

```bash
npm run env:fix-local
```

## Install and run

```bash
npm install
npm run dev
```

Default local app URL:

```text
http://localhost:3000
```

## Typecheck and build

```bash
npm run check
npm run build
```

Equivalent direct command:

```bash
npx tsc --noEmit
```

## Supabase migrations

Push migrations to the linked Supabase project:

```bash
npx supabase db push
```

Generate database types after schema changes:

```bash
npx supabase gen types typescript --linked --schema public > src/lib/supabase/database.types.ts
```

For local Supabase:

```bash
npx supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
```

## Admin roles

Roles are stored in `public.user_roles`. Source of truth: `user_roles` defines the role identity, while `admin_area_permissions` defines district/taluka/module scope for limited admins. Common roles:

- `admin`
- `super_admin`
- `membership_admin`
- `education_admin`
- `health_admin`
- `welfare_admin`
- `employment_admin`
- `finance_admin`

Assign a role from Supabase SQL Editor:

```sql
insert into public.user_roles (user_id, role)
values ('USER_UUID_HERE', 'admin')
on conflict (user_id, role) do nothing;
```


Membership review access:

```text
super_admin, admin, membership_admin
```

Only these roles should approve/reject membership applications or open admin member card previews. Area-scoped access is handled through `admin_area_permissions`.

Program-specific example:

```sql
insert into public.user_roles (user_id, role)
values ('USER_UUID_HERE', 'employment_admin')
on conflict (user_id, role) do nothing;
```


## Safe project export

Never share a raw project zip created from the whole folder. Raw exports can accidentally include `.env.local`, `.git`, `.output`, `node_modules`, Supabase local state, logs, backups, or old zip files.

Use the safe export script instead:

```bash
npm run safe-export
```

The archive will be created in `exports/` and will exclude secrets, git history, build output, dependencies, Supabase temp folders, platform state, generated archives, Android packages, and certificate/key files.

After creating an archive, verify it:

```bash
npm run qa:archive -- exports/<archive-name>.zip
```

Manual fallback if needed:

```bash
zip -r jas-app-safe.zip . \
  -x ".env" ".env.local" ".env.production" ".env.development" ".env.test" ".env.*.local" "*.local" \
  -x ".git/*" "node_modules/*" ".output/*" "dist/*" "dist-ssr/*" \
  -x ".tanstack/*" ".nitro/*" ".vinxi/*" ".wrangler/*" "__unconfig*/*" \
  -x "supabase/.temp/*" "supabase/.branches/*" "supabase/snippets/*" \
  -x "backups/*" "exports/*" "*.log" "*.zip" ".DS_Store"
```

If a real Supabase service-role key was ever included in a shared archive, rotate it from the Supabase dashboard immediately.

## Lockfile sync

After dependency changes, sync the npm lockfile before committing:

```bash
npm run lock:sync
npm run check
npm run build
```

For clean machine/Vercel-style verification, use:

```bash
npm run lock:check
npm ci
npm run check
npm run build
```

Full preflight:

```bash
npm run preflight
```

## Key routes

Public/member routes:

```text
/
/signup
/login
/register
/dashboard
/notifications
/notification-preferences
/card
/verify/$memberNo
/donate
/donors
/programs/education
/programs/health
/programs/welfare
/programs/employment
```

Admin routes:

```text
/admin
/admin/members/$id
/admin/members/$id/card
/admin/programs/education
/admin/programs/health
/admin/programs/welfare
/admin/programs/employment
/admin/finance
/admin/notifications
```

## Security notes

- Keep storage buckets private unless explicitly public.
- Medical, welfare, finance and employment documents should only be viewed by authorized roles.
- Leaderboard includes only finance-approved donations.
- CNIC/mobile are masked by default in admin lists.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
- Do not share project zips containing `.env.local`, `.git`, `.output`, or `supabase/.temp`.

## Clean zip sharing

Never share a raw project folder or manually-created zip. Use the built-in safe export command so secrets, local Supabase state, build output, git history, logs, and Android signing/package files are excluded and verified.

```bash
npm run safe-export
npm run qa:archive
```

For an explicit archive path:

```bash
npm run qa:archive -- exports/jas-app-safe-YYYYMMDD-HHMMSS.zip
```

Before sharing a zip, you can also run the lightweight secret scanner:

```bash
npm run scan:secrets
```

If a raw zip containing `.env`, `.env.local`, `SUPABASE_SERVICE_ROLE_KEY`, or a VAPID private key was already shared, rotate those cloud secrets immediately.

## Recommended next builds

1. Public Website + CMS Phase 1
2. News / Gallery / Events Phase 1
3. Admin Reports Center
4. Role Management UI
5. Committee and Designation Management

## Phase 8 email system

Branded JAS authentication templates are stored in `supabase/templates/`. Signup email confirmation is intentionally excluded and local `auth.email.enable_confirmations` remains `false`, so new email/password users can sign in immediately. Password recovery, email-change, invitation, security, and important membership/program notifications remain supported through Supabase Auth and the protected `send-notification-emails` Edge Function with Brevo.

Validate templates and core QA:

```bash
npm run email:templates:check
npm run qa:core
```

Deployment and cron setup are documented in `PATCH_NOTES_PHASE8_BRANDED_EMAILS.md`.


## Phase 9 web push reliability

Web push now uses a durable, rate-limited delivery queue instead of direct best-effort sends. Members can manage categories and saved devices at `/notification-preferences`. Admin and super-admin accounts can send filtered campaigns and review/retry delivery failures at `/admin/notifications`.

Apply and validate the Phase 9 migration:

```bash
npx supabase db push --dry-run
npx supabase db push
npm run push:check
npm run qa:core
```

Set the server-only push worker secrets and deploy the worker:

```bash
npx supabase secrets set \
  VAPID_PUBLIC_KEY="YOUR_PUBLIC_VAPID_KEY" \
  VAPID_PRIVATE_KEY="YOUR_PRIVATE_VAPID_KEY" \
  VAPID_SUBJECT="mailto:support@jasofficial.org" \
  PUSH_SEND_SECRET="$(openssl rand -hex 32)" \
  PUSH_MAX_SENDS_PER_MINUTE="120"

npx supabase functions deploy send-web-push --no-verify-jwt
```

Schedule a trusted one-minute POST request to the function with the `X-Push-Secret` header and `{"batch_size":20}` body. Full migration, Cron, preference, delivery-log, and production test instructions are in `PATCH_NOTES_PHASE9_WEB_PUSH_RELIABILITY.md`.
