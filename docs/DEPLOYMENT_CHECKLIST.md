# JAS Deployment Checklist

## Before push

```bash
npm run env:check
npm run lock:check
npm run scan:secrets
npm run check
npm run build
bash scripts/verify-project.sh
git status
```

## Before Supabase cloud migration

```bash
npx supabase migration list
npx supabase db push
```

After migration, check:

- Security Advisor warnings
- Performance Advisor warnings
- `admin_area_permissions` table
- `audit_logs` table
- Office bearer verification route data

## Before Vercel deploy

Set environment variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PUBLIC_SITE_URL=https://jasofficial.org
VITE_SITE_URL=https://jasofficial.org
VITE_VAPID_PUBLIC_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or any private secret to client variables. Never use `VITE_` for private keys such as `VAPID_PRIVATE_KEY`.


## Supabase-only secrets

Keep these out of Vercel frontend env:

```bash
npx supabase secrets set VAPID_PUBLIC_KEY="..."
npx supabase secrets set VAPID_PRIVATE_KEY="..."
npx supabase secrets set VAPID_SUBJECT="mailto:support@jasofficial.org"
```

Brevo SMTP credentials stay in Supabase Auth SMTP settings only. Do not add Brevo SMTP password/API key to Vercel env for the forgot-password flow.

## After deploy smoke test

- `/`
- `/login`
- `/dashboard`
- `/card`
- `/designation-card`
- `/verify/office-bearer/<id>`
- `/admin`
- `/admin/area-permissions`
- `/admin/audit-logs`

## Safe handoff/export

```bash
npm run safe-export
npm run qa:archive -- exports/<archive-name>.zip
```

Never share raw project folders/zips. Always use `npm run safe-export`, then verify with `npm run qa:archive`.
