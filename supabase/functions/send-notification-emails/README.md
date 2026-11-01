# send-notification-emails

Protected queue worker for Phase 8 notification emails.

Required Supabase Edge Function secrets:

```bash
npx supabase secrets set \
  BREVO_API_KEY="your-brevo-api-key" \
  BREVO_SENDER_EMAIL="support@jasofficial.org" \
  BREVO_SENDER_NAME="Jatt Alliance Sindh" \
  EMAIL_WORKER_SECRET="generate-a-long-random-secret" \
  PUBLIC_SITE_URL="https://jasofficial.org"
```

Optional safe test mode:

```bash
npx supabase secrets set BREVO_SANDBOX_MODE="true"
```

Deploy:

```bash
npx supabase functions deploy send-notification-emails --no-verify-jwt
```

The function accepts only `POST` requests with the same secret in the
`X-Email-Worker-Secret` header. A scheduled call should run once per minute.
