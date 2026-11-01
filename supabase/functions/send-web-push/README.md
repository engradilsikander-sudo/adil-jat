# send-web-push Edge Function

Protected Phase 9 worker for the durable `public.web_push_deliveries` queue.

The database trigger queues one delivery per enabled browser subscription whenever an in-app notification is created and the member's category preferences allow browser push.

## Reliability behavior

- Atomic `FOR UPDATE SKIP LOCKED` job claims
- Maximum five attempts per delivery
- Exponential retry delay: 1, 2, 4, 8, then dead
- Ten-minute stuck-worker recovery
- Database-enforced global per-minute rate capacity
- Maximum 50 jobs per invocation
- Concurrency limited to five provider requests
- HTTP 404/410 subscriptions automatically disabled
- Failure reason and HTTP status stored without endpoint/key data
- User preferences checked again at claim time

## Required secrets

```bash
npx supabase secrets set \
  VAPID_PUBLIC_KEY="YOUR_PUBLIC_VAPID_KEY" \
  VAPID_PRIVATE_KEY="YOUR_PRIVATE_VAPID_KEY" \
  VAPID_SUBJECT="mailto:support@jasofficial.org" \
  PUSH_SEND_SECRET="$(openssl rand -hex 32)" \
  PUSH_MAX_SENDS_PER_MINUTE="120"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by the Supabase Edge Function runtime. Never expose the private VAPID key or worker secret with a `VITE_` prefix.

## Deploy

```bash
npx supabase functions deploy send-web-push --no-verify-jwt
```

## Worker request

```bash
curl -X POST "https://PROJECT_REF.supabase.co/functions/v1/send-web-push" \
  -H "Content-Type: application/json" \
  -H "X-Push-Secret: $PUSH_SEND_SECRET" \
  -d '{"batch_size":20}'
```

Schedule the same request once per minute with Supabase Cron. Keep the secret in Vault/Edge Function secrets rather than committed SQL.
