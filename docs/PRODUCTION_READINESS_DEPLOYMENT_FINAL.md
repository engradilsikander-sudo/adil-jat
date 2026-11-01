# JAS Production Readiness & Deployment Final Checklist

This checklist is for the JAS membership portal production deployment on Vercel + Supabase.

## 1. Required local checks

Run from project root:

```bash
npm run check
npm run build
npm run verify:production
```

If you only want file/remote checks and want to skip build inside the verification script:

```bash
SKIP_BUILD=1 npm run verify:production
```

## 2. Required Vercel environment variables

Client-safe variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PUBLIC_SITE_URL=https://jasofficial.org
VITE_SITE_URL=https://jasofficial.org
VITE_VAPID_PUBLIC_KEY=
```

Server-only variables:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, or any private secret with a `VITE_` prefix.

## 3. Required Supabase production steps

Before final Vercel deploy:

```bash
npx supabase migration list
npx supabase db push
npx supabase functions deploy send-web-push
```

Set Edge Function secrets for Web Push:

```bash
npx supabase secrets set VAPID_PUBLIC_KEY="YOUR_PUBLIC_KEY"
npx supabase secrets set VAPID_PRIVATE_KEY="YOUR_PRIVATE_KEY"
npx supabase secrets set VAPID_SUBJECT="mailto:nomankhan20322@gmail.com"
```

## 4. Required production route smoke tests

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

Admin routes:

- `/admin`
- `/admin/roles`
- `/admin/area-permissions`
- `/admin/audit-logs`
- `/admin/finance`
- `/admin/reports`
- `/admin/programs/education`
- `/admin/programs/health`
- `/admin/programs/welfare`
- `/admin/programs/employment`

## 5. Production data tests

- New user signup works.
- New membership application can be submitted.
- Receipt upload works.
- Admin can approve/reject.
- Approved member number is generated.
- `/card` works for approved member.
- QR opens public verification page.
- Membership approval notification appears.
- Avatar/Updates unread badge appears and clears on Updates page.
- Browser push subscription can be enabled after VAPID setup.

## 6. Deployment command flow

```bash
cd ~/projects/jas-app

npm run check
npm run build
npm run verify:production

git status
git add .
git commit -m "Prepare production and Android release readiness"
git push origin main
```

## 7. Post-deployment remote checks

```bash
curl -I https://jasofficial.org/manifest.json
curl -I https://jasofficial.org/sw.js
curl -I https://jasofficial.org/offline.html
curl -I https://jasofficial.org/.well-known/assetlinks.json
```

Expected for Android TWA:

```text
https://jasofficial.org/.well-known/assetlinks.json -> HTTP/2 200
https://www.jasofficial.org/.well-known/assetlinks.json -> 308 redirect to jasofficial.org
```

## 8. Files that must never be committed

- `.env.local`
- `.env.production`
- `signing.keystore`
- `signing-key-info.txt`
- `*.apk`
- `*.aab`
- old raw project zips

Use safe export only:

```bash
npm run safe-export
npm run qa:archive -- exports/<archive-name>.zip
```
