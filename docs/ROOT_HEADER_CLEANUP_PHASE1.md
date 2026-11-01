# Root/Header Cleanup Phase 1

This patch cleans the root header/navigation without touching database, Supabase migrations, elections, or route logic.

## Updated

- `src/routes/__root.tsx`

## Changes

### Removed mobile hamburger drawer

Removed:

- `mobileOpen` state
- hamburger `Menu` button
- `X` icon state
- `mobile-navigation-panel`
- `MobileNavLink`
- `getDelayClass`
- mobile drawer navigation duplication

### Mobile header now uses

```txt
Logo | Language | Account Avatar
```

The avatar/account trigger works for both logged-in and logged-out users.

### More dropdown cleaned

`More` now contains organization/public pages only:

- About JAS
- Vision & Mission
- Manifesto
- Constitution
- CWC
- Committees
- Gallery
- Events
- Contact

Removed from `More`:

- Donors
- Updates
- Register
- Digital Card
- Office Bearer Card
- Admin

### Account menu improved

Logged-in account menu includes:

- Dashboard / Admin Panel
- Digital Card
- Office Bearer Card
- Updates
- Donors
- Register
- Logout

Logged-out mobile account menu includes:

- Login
- Join Now

### Dynamic avatar initial

Avatar initial now uses the logged-in user's email first letter instead of hardcoded `A` or `N`.

## Not changed yet

This phase does not split `__root.tsx` into components and does not clean `src/routes/index.tsx`.
Those should be separate next patches.

## Recommended next patch

`Root/Header Cleanup Phase 2`

- Split header into components:
  - `Header.tsx`
  - `AccountMenu.tsx`
  - `ProgramsDropdown.tsx`
  - `MoreDropdown.tsx`
  - `PwaBootstrap.tsx`
  - `NotFoundPage.tsx`
- Add `useAuthRole.ts`
