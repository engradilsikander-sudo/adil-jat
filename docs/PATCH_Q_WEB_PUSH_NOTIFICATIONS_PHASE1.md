# Patch Q — Web Push Notifications Phase 1

## What this patch adds

1. Browser/PWA push subscription table: `public.push_subscriptions`.
2. RLS policies so logged-in users can save/update/delete only their own browser subscription.
3. `VITE_VAPID_PUBLIC_KEY` frontend env support.
4. Global PWA toast to enable browser notifications for logged-in users.
5. Browser permission request and PushManager subscription flow.
6. Push subscription save/upsert to Supabase.
7. Service worker `push` event handler using `showNotification`.
8. Service worker `notificationclick` handler that opens `/notifications` or payload URL.
9. Supabase Edge Function skeleton: `send-web-push`.
10. `tsconfig.json` excludes `supabase/functions` from app TypeScript check.

## Required env/secrets

Frontend / Vercel:

```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

Supabase Edge Function secrets:

```bash
npx supabase secrets set VAPID_PUBLIC_KEY="PUBLIC_KEY_HERE"
npx supabase secrets set VAPID_PRIVATE_KEY="PRIVATE_KEY_HERE"
npx supabase secrets set VAPID_SUBJECT="mailto:nomankhan20322@gmail.com"
```

## Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

## Apply database migration

```bash
npx supabase db push
```

## Deploy Edge Function

```bash
npx supabase functions deploy send-web-push
```

## Notes

This patch enables browser subscriptions and gives you a send function skeleton. It does not automatically call the Edge Function from every notification trigger yet. That should be Phase 2 after you test subscriptions and one manual send.
