# Dashboard + Register Final Mobile Polish

This patch improves the member dashboard and membership registration form after the Root/Header and Home cleanup phases.

## Scope

UI polish only.

This patch does not add:

- election files
- database migrations
- route tree changes
- Supabase schema changes
- membership card/export changes

## Updated files

- `src/routes/dashboard.tsx`
- `src/routes/register.tsx`
- `src/styles.css`

## Dashboard improvements

- Dashboard now respects the selected language direction.
- Urdu/Sindhi dashboard text aligns better through RTL-aware CSS.
- Mobile page padding reduced.
- Hero section spacing improved on small screens.
- Hero title scales better on mobile.
- Member info chips stack cleanly on narrow screens.
- Profile card is safer on very small widths.
- Overview cards avoid horizontal overflow.
- Main content/sidebar layout improves on tablet and mobile.
- Quick action buttons become full-width on mobile.
- Membership fee panel is clearer and safer on small screens.
- Payment QR card is centered and constrained.
- IBAN/account/detail values use safer wrapping.

## Register improvements

- Payment panel got dedicated class hooks.
- Bank details layout is safer on mobile.
- QR block is constrained and centered.
- Payment receipt upload button supports long filenames better.
- Urdu/Sindhi RTL form alignment improved.
- RTL select dropdown arrow position fixed.
- Step tabs wrap better on mobile.
- Progress top section stacks better on small screens.
- Form buttons stay full-width on mobile.
- Very small screen spacing improved.

## Important

The manual payment details and QR image are not changed.

Current values remain controlled from:

```ts
src/lib/membership-fee.ts
```

## QA checklist

### Dashboard

- Open `/dashboard` on desktop.
- Open `/dashboard` on mobile.
- Switch English / Urdu / Sindhi.
- Check hero title and member name.
- Check Quick Actions buttons.
- Check Membership Fee panel.
- Check QR code size.
- Check IBAN/account details wrapping.
- Confirm no horizontal scroll.

### Register

- Open `/register` on desktop.
- Open `/register` on mobile.
- Switch English / Urdu / Sindhi.
- Walk through all form steps.
- Check payment details block.
- Check QR image.
- Upload a long receipt filename.
- Check validation messages.
- Confirm submit button remains reachable.
- Confirm no horizontal scroll.
