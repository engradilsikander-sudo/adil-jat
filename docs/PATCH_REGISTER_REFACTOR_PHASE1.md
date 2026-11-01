# Patch — Register Refactor Phase 1

Branding: **JAS — Jatt Alliance Sindh**

## Goal

Split the large membership registration route into focused, maintainable step components and shared registration helpers without changing the user-facing flow.

## What changed

- `src/routes/register.tsx` is now the route/container layer.
- Step UI moved into focused components:
  - `RegisterIdentityStep.tsx`
  - `RegisterAreaStep.tsx`
  - `RegisterProfileStep.tsx`
  - `RegisterEmergencyStep.tsx`
  - `RegisterPaymentStep.tsx`
- Shared field shell components moved to `RegisterFormShell.tsx`.
- Registration types, draft helpers, step metadata, description-id helpers, and validation moved to `src/lib/register.validation.ts`.
- Existing district/taluka option data is reused from `src/lib/register/registration-options.ts`.

## Behavior kept the same

- Auth guard redirects unauthenticated users to `/login`.
- Existing pending/rejected/approved membership handling is unchanged.
- Draft save/clear behavior is unchanged.
- Photo upload validation is unchanged.
- Payment receipt validation and locked final payment behavior are unchanged.
- Membership submission/resubmission payloads are unchanged.

## Validation

Run:

```bash
npm run check
npm run build
```

## Manual test checklist

1. Log in as a normal user.
2. Open `/register`.
3. Complete each step using Next/Previous.
4. Try invalid CNIC/mobile values and confirm validation focuses the first invalid field.
5. Save draft, refresh page, and confirm draft restores.
6. Clear draft and confirm the banner updates.
7. Upload member photo and payment receipt.
8. Submit a new application.
9. Edit a pending application.
10. Resubmit a rejected application and confirm status returns to pending.
11. Confirm an approved member cannot edit locked fields.
