# Patch — Auth Recovery Polish + Password Strength

Branding note: visible brand remains **JAS (Jatt Alliance Sindh)**. This patch does not rename routes, member numbers, database fields, or technical prefixes.

## What changed

### Forgot password

- Added a stronger post-submit “reset link sent” confirmation screen.
- Masks the submitted email address for privacy.
- Adds next-step guidance for inbox, spam/junk/promotions, and latest-link usage.
- Adds “Send Again” and “Use Different Email” actions.
- Redirects already-authenticated users away from `/forgot-password` to `/dashboard`.
- Improves friendly error messages for rate limits and email service issues.

### Reset password

- Adds password strength meter.
- Requires a stronger password rule:
  - at least 8 characters
  - uppercase letter
  - number
  - symbol
- Adds live password-match feedback.
- Adds separate show/hide toggles for password and confirm password.
- Improves invalid/expired reset-link handling.
- Shows a clear “Request New Reset Link” action when the reset link is invalid or expired.
- Improves friendly update-password errors.

### Languages

Updated copy for:

- English
- Urdu
- Sindhi

## Changed files

```txt
src/routes/forgot-password.tsx
src/routes/reset-password.tsx
src/lib/i18n.tsx
docs/PATCH_AUTH_RECOVERY_POLISH.md
```

## Apply

```bash
cd ~/projects/jas-app
unzip -o /mnt/c/Users/*/Downloads/jas-auth-recovery-polish-patch.zip -d .
```

## Verify

```bash
npm run check
npm run build
```

## Manual test checklist

1. Open `/forgot-password` while logged out.
2. Enter a registered email and submit.
3. Confirm the success screen appears with inbox/spam guidance.
4. Click “Send Again” and confirm no UI break.
5. Click “Use Different Email” and confirm the email field returns.
6. Open the reset email link.
7. Try a weak password and confirm the meter blocks submit.
8. Try mismatched confirm password and confirm live mismatch warning.
9. Set a strong matching password.
10. Confirm redirect to login and login with the new password.
11. Open an expired/old reset link and confirm the invalid-link panel appears.

## Supabase reminder

Supabase Dashboard → Authentication → URL Configuration should include:

```txt
Site URL:
https://jasofficial.org

Redirect URLs:
https://jasofficial.org/reset-password
http://localhost:3000/reset-password
```
