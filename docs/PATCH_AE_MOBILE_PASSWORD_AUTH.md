# Patch AE — Mobile Number + Password Auth v1

## Purpose

This patch converts the existing mobile OTP auth tab into a mobile number + password flow.

Users can now:

- Sign up with Full Name, Mobile Number, Password and Confirm Password.
- Log in with Mobile Number and Password.
- Continue using the existing Email + Password flow.

## Supabase notes

The app normalizes Pakistan mobile numbers to Supabase-friendly E.164 format:

- `03001234567` → `+923001234567`
- `923001234567` → `+923001234567`
- `+923001234567` → `+923001234567`

For local Supabase, this patch updates `supabase/config.toml`:

- `[auth.sms].enable_signup = true`
- `[auth.sms].enable_confirmations = false`

For Supabase Cloud, verify these dashboard settings before production testing:

1. Authentication → Sign In / Providers → Phone enabled.
2. Phone signups allowed.
3. Phone confirmations disabled if you want mobile + password without OTP.

## Security warning

Without OTP, mobile ownership is not verified by Supabase. Keep CNIC/mobile checks in the membership form and let admin verify member details during approval.

## Files changed

- `src/routes/signup.tsx`
- `src/routes/login.tsx`
- `src/lib/i18n.tsx`
- `supabase/config.toml`

## QA

Run:

```bash
npm run check
npm run build
```

Manual checks:

1. `/signup` → Mobile + Password tab → create account using `03XXXXXXXXX` and password.
2. Logout.
3. `/login` → Mobile + Password tab → login using same mobile number and password.
4. Confirm email signup/login still works.
5. Confirm `/dashboard` redirects properly after login.
