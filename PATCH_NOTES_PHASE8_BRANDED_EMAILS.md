# Phase 8 — Branded Email Templates + Notification Emails

## Brand standard

All visible email branding uses:

- **JAS**
- **Jatt Alliance Sindh**
- `support@jasofficial.org`
- `jasofficial.org`

`JASW` and the old welfare branding are intentionally not used.

## Included

### Supabase Auth templates

Branded HTML templates are included for:

- Invite
- Password recovery
- Magic link / email OTP
- Email change confirmation
- Reauthentication code
- Password changed security alert
- Email changed security alert
- Phone changed security alert
- Identity linked/unlinked alerts
- MFA method added/removed alerts

Signup email confirmation is intentionally excluded. Local configuration keeps `auth.email.enable_confirmations = false`, so a new email/password account can sign in immediately without opening a confirmation email.

Local Supabase reads the remaining files through `supabase/config.toml`. Hosted Supabase does **not** deploy dashboard email templates through a database migration; copy only the remaining subjects and HTML from `supabase/templates/` into **Authentication → Email Templates** and enable the security notifications there.

### Transactional member notification emails

Important in-app notifications now create a server-only delivery job for these categories:

- Membership approval/rejection
- Membership payment updates
- Profile update request decisions
- Education, health, welfare, and employment application updates
- Donation verification updates

General/noise notifications are not emailed.

The queue stores only the notification reference and delivery metadata. Recipient email addresses are resolved from Supabase Auth at send time and are not copied into the queue table.

### Reliability and security

- Atomic queue claiming with `FOR UPDATE SKIP LOCKED`
- Five delivery attempts with exponential retry delay
- Stale worker protection using the claimed attempt number
- Missing-email accounts marked `skipped`
- Permanent provider errors marked `dead`
- Brevo message ID stored for delivery tracing
- Notification title, message, and member name HTML-escaped
- External/open-redirect action URLs blocked
- Worker protected by `X-Email-Worker-Secret`
- Brevo API key stays in Edge Function secrets
- Optional Brevo sandbox mode
- English/Urdu/Sindhi notification content supported, including RTL rendering

## Files

- `supabase/templates/*.html`
- `supabase/functions/send-notification-emails/index.ts`
- `supabase/functions/_shared/notification-email.ts`
- `supabase/migrations/20260710230000_branded_notification_emails.sql`
- `src/lib/notification-email.test.ts`
- `scripts/check-email-templates.mjs`

## Local setup

Restart local Supabase after changing auth template configuration:

```bash
npx supabase stop
npx supabase start
```

Apply migrations:

```bash
npx supabase migration up --local
```

Local Auth emails are visible in Mailpit/Inbucket on the port shown by:

```bash
npx supabase status
```

## Cloud setup

### 1. Keep signup email confirmation disabled

In Supabase Cloud open **Authentication → Providers → Email** and keep **Confirm email** disabled. Do not copy or configure a signup confirmation template. Password-recovery and security emails remain enabled.

### 2. Apply migration

```bash
npx supabase db push --dry-run
npx supabase db push
```

### 3. Configure Edge Function secrets

Generate a worker secret locally:

```bash
openssl rand -hex 32
```

Set secrets without a `VITE_` prefix:

```bash
npx supabase secrets set \
  BREVO_API_KEY="YOUR_BREVO_API_KEY" \
  BREVO_SENDER_EMAIL="support@jasofficial.org" \
  BREVO_SENDER_NAME="Jatt Alliance Sindh" \
  EMAIL_WORKER_SECRET="YOUR_GENERATED_WORKER_SECRET" \
  PUBLIC_SITE_URL="https://jasofficial.org" \
  BREVO_SANDBOX_MODE="true"
```

Deploy:

```bash
npx supabase functions deploy send-notification-emails --no-verify-jwt
```

Keep sandbox mode enabled for the first request. Brevo validates the request but does not deliver it. Disable it after verification:

```bash
npx supabase secrets set BREVO_SANDBOX_MODE="false"
```

### 4. Schedule the worker

Use Supabase Dashboard **Integrations → Cron** or SQL Editor with `pg_cron`, `pg_net`, and Vault. Store the project URL and worker secret in Vault, then call this endpoint once per minute:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification-emails
```

Required request details:

```text
Method: POST
Header: X-Email-Worker-Secret: <same EMAIL_WORKER_SECRET>
Content-Type: application/json
Body: {"batch_size":20}
Schedule: * * * * *
```

Do not place the worker secret directly in a committed migration or frontend environment variable.

## Validation

```bash
npm run email:templates:check
npm run check
npm test
npm run build
npm run qa:core
```

Database-only smoke checks:

```text
supabase/qa/notification-email-smoke-tests.sql
```

## Production test

1. Keep Brevo sandbox mode enabled.
2. Approve or reject a test membership/profile update.
3. Confirm one row appears in `notification_email_deliveries`.
4. Run the worker manually or wait for cron.
5. Confirm status becomes `sent` and a provider message ID is recorded.
6. Disable sandbox mode.
7. Trigger one test notification for an email-based account.
8. Confirm the branded email arrives and its button opens only a `jasofficial.org` route.
9. Confirm phone-only accounts become `skipped`, not repeatedly retried.
