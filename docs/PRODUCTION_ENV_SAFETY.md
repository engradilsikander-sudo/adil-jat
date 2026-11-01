# Production Environment Safety — JAS

This guide defines which secrets belong in Vercel, Supabase Cloud, and local-only files for the JAS — Jatt Alliance Sindh app.

## Rule 1: `VITE_` means browser-visible

Anything with a `VITE_` prefix can be included in the frontend bundle. Keep only public/client-safe values there.

Allowed client env:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PUBLIC_SITE_URL=https://jasofficial.org
VITE_SITE_URL=https://jasofficial.org
VITE_VAPID_PUBLIC_KEY=public_web_push_key_only
```

Never use these names:

```env
VITE_SUPABASE_SERVICE_ROLE_KEY=...
VITE_VAPID_PRIVATE_KEY=...
VITE_BREVO_API_KEY=...
VITE_SMTP_PASSWORD=...
VITE_JWT_SECRET=...
```

## Vercel environment variables

Use Vercel only for frontend-safe values and server-only values needed by TanStack server actions.

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_PUBLIC_SITE_URL=https://jasofficial.org
VITE_SITE_URL=https://jasofficial.org
VITE_VAPID_PUBLIC_KEY=...

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` must **not** have a `VITE_` prefix.

## Supabase Cloud secrets

Web push private values belong in Supabase Edge Function secrets:

```bash
npx supabase secrets set VAPID_PUBLIC_KEY="..."
npx supabase secrets set VAPID_PRIVATE_KEY="..."
npx supabase secrets set VAPID_SUBJECT="mailto:support@jasofficial.org"
```

## Brevo SMTP

Brevo SMTP credentials are configured in Supabase Cloud:

```text
Supabase Dashboard
→ Authentication
→ Emails / SMTP Settings
→ Custom SMTP
```

Do **not** add Brevo SMTP username/password/API key to Vercel frontend env. Forgot password email is sent by Supabase Auth, not by the browser.

## Local env cleanup

If old local files contain `VITE_VAPID_PRIVATE_KEY`, run:

```bash
npm run env:fix-local
npm run env:check
```

The fix script renames known dangerous client-prefixed variables to server-only names and creates a timestamped backup.

## Production preflight

Before deployment or sharing a ZIP:

```bash
npm run env:check
npm run lock:check
npm run scan:secrets
npm run check
npm run build
npm run safe-export
npm run qa:archive -- exports/<archive-name>.zip
```

## If a secret was shared by mistake

Rotate it immediately:

1. Supabase service role key: Supabase Dashboard → Project Settings → API → rotate/regenerate.
2. VAPID keys: generate a new pair and update Supabase Edge Function secrets + Vercel public key.
3. Brevo SMTP key: Brevo Dashboard → SMTP/API keys → revoke/regenerate.
4. Re-deploy Vercel and Supabase Edge Functions after updating secrets.
