# Web Push Security Checklist

The `send-web-push` Edge Function is privileged because it reads push subscriptions with the Supabase service-role key and sends notifications to user devices.

## Safe calling pattern

For browser/PWA calls, send only:

```json
{
  "notification_id": "uuid"
}
```

The function verifies that the logged-in user owns that notification before sending.

## Admin/internal calling pattern

Direct payloads are allowed only for admin sessions or trusted server calls with `X-Push-Secret`:

```json
{
  "user_id": "uuid",
  "title": "JAS Update",
  "body": "Your membership has been approved.",
  "url": "/notifications"
}
```

## Required deployment settings

Set secrets with Supabase CLI or dashboard:

```bash
supabase secrets set VAPID_PUBLIC_KEY="..."
supabase secrets set VAPID_PRIVATE_KEY="..."
supabase secrets set VAPID_SUBJECT="mailto:admin@example.com"
supabase secrets set SUPABASE_URL="https://PROJECT.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."
supabase secrets set PUSH_SEND_SECRET="$(openssl rand -base64 48)"
supabase secrets set APP_ORIGIN="https://jasofficial.org,http://localhost:3000"
```

Do not place `VAPID_PRIVATE_KEY`, `PUSH_SEND_SECRET`, or `SUPABASE_SERVICE_ROLE_KEY` in any `VITE_` variable.

## Smoke tests

No auth should fail:

```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/send-web-push" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"00000000-0000-4000-8000-000000000000","title":"Test"}'
```

Member session direct payload should fail with 403.

Member session with own `notification_id` should return sent/failed/removed counts.

Admin session or `X-Push-Secret` may send direct payloads.
