# Phase 9 — Web Push Reliability + Preferences

This phase replaces direct, best-effort push sending with a durable delivery queue and adds user controls, device management, delivery logs, and an admin notification center.

## Member features

New route:

```text
/notification-preferences
```

Members can:

- enable push for the current production HTTPS browser;
- pause or resume all web push notifications;
- choose membership, program, finance, and general categories;
- view saved browser devices without exposing full push endpoints;
- remove the current browser subscription;
- disable all saved browser devices;
- see permission, configuration, and recent delivery health information.

The existing `/notifications` page now links to these preferences.

## Admin features

New route:

```text
/admin/notifications
```

Only `admin` and `super_admin` can use the notification center. It supports:

- bulk in-app and browser-push campaigns;
- recipient filters by member status, district, and taluka;
- recipient caps from 1 to 1,000;
- safe same-origin action URLs;
- campaign history and recipient/push counts;
- recent delivery status totals;
- failed/dead delivery inspection;
- manual retry after an eligible subscription is restored.

Bulk campaigns intentionally do not enter the Phase 8 email queue, avoiding duplicate mass email delivery.

## Reliability and safety

The new database queue provides:

- atomic `FOR UPDATE SKIP LOCKED` job claiming;
- a database-enforced global per-minute rate limit;
- a maximum of five delivery attempts;
- bounded exponential retry delays;
- recovery of workers stuck in `sending` for more than ten minutes;
- automatic disablement of expired subscriptions after HTTP 404/410;
- delivery states: `queued`, `sending`, `sent`, `failed`, `skipped`, and `dead`;
- sanitized provider errors with no endpoint or key material in logs;
- user/category preference checks both when queuing and when claiming;
- audit logging for notification campaigns;
- service-role-only queue claiming and delivery result functions.

The Edge Function no longer uses `@ts-nocheck`. It requires a private worker secret, uses bounded concurrency, validates notification URLs, and records every result through protected RPC functions.

The service worker also validates notification click targets and falls back to `/notifications` for external, protocol-relative, backslash, or control-character URLs.

## Database migration

```text
supabase/migrations/20260711010000_web_push_reliability_preferences.sql
```

It creates or extends:

```text
notification_preferences
push_subscriptions
web_push_deliveries
notification_campaigns
```

Apply locally:

```bash
npx supabase status
npx supabase migration up --local
```

Apply to the linked cloud project:

```bash
npx supabase db push --dry-run
npx supabase db push
```

After applying the migration, run:

```text
supabase/qa/web-push-reliability-smoke-tests.sql
```

in the Supabase SQL Editor.

## Required secrets

The browser receives only the public VAPID key through the frontend environment:

```env
VITE_VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY
```

Set server-only values as Supabase Edge Function secrets:

```bash
npx supabase secrets set \
  VAPID_PUBLIC_KEY="YOUR_PUBLIC_VAPID_KEY" \
  VAPID_PRIVATE_KEY="YOUR_PRIVATE_VAPID_KEY" \
  VAPID_SUBJECT="mailto:support@jasofficial.org" \
  PUSH_SEND_SECRET="$(openssl rand -hex 32)" \
  PUSH_MAX_SENDS_PER_MINUTE="120"
```

Never use a `VITE_` prefix for the private VAPID key or worker secret.

Deploy the worker:

```bash
npx supabase functions deploy send-web-push --no-verify-jwt
```

## Cron request

Schedule the worker once per minute using Supabase Cron or another trusted scheduler:

```text
POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-web-push
X-Push-Secret: YOUR_PUSH_SEND_SECRET
Content-Type: application/json

{"batch_size":20}
```

The database rate limit remains authoritative even when overlapping workers invoke the endpoint.

Do not commit the worker secret in a migration, cron SQL file, frontend source, or repository documentation containing real values.

## Local behavior

Development mode intentionally unregisters the production service worker, so browser subscription actions are shown as production HTTPS features. Preference rows and category controls can still be tested locally after applying the migration.

## Validation

```bash
npm run push:check
npm run check
npm test
npm run build
```

Complete Phase 8 + Phase 9 core QA:

```bash
npm run qa:core
```

## Production test checklist

1. Apply the migration and deploy `send-web-push`.
2. Configure `VITE_VAPID_PUBLIC_KEY` in the production frontend.
3. Add the worker secrets and one-minute Cron request.
4. Open `/notification-preferences` from an approved member account.
5. Enable the current browser and confirm the device is listed.
6. Disable one category and confirm a matching notification is not queued.
7. Send a small admin campaign with a recipient limit of one.
8. Confirm an in-app notification and one `web_push_deliveries` row are created.
9. Confirm the worker changes the row to `sent` or a retryable `failed` state.
10. Test an expired subscription and confirm it becomes disabled after 404/410.
11. Retry a failed row from `/admin/notifications` after correcting the subscription.
12. Confirm the campaign appears in Admin Audit Logs.
13. Confirm no bulk campaign email is queued in `notification_email_deliveries`.

## Supabase Auth template compatibility correction

Phase 9 also corrects local Supabase template paths: auth action templates use project-root paths such as `./supabase/templates/recovery.html`, while security-notification templates use paths relative to the `supabase` directory such as `./templates/password_changed_notification.html`.

Signup email confirmation remains disabled and the signup confirmation template remains excluded.
