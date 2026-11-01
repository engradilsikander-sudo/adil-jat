# Admin UI Provider + Avatar Cleanup Fix

This patch fixes three issues reported after the admin sidebar and dropdown updates.

## Fixed

### 1. Duplicate Admin Panel in avatar dropdown

Admin users could still see `Admin Panel` twice in the avatar menu.

The admin avatar menu is now forced to contain only one admin route item:

```txt
Admin Panel
Digital Card
Office Bearer Card
Updates
Donors
Register
Logout
```

`Members`, `Programs`, `Donations` and `Reports` remain available from the Admin sidebar, not the avatar dropdown.

### 2. User-facing placeholder text on admin dashboard

The dashboard text:

```txt
Cleaner admin flow
Navigation moved to sidebar
Large duplicate module cards were removed...
```

was removed/replaced with practical membership summary text.

New wording focuses on:

```txt
Membership Summary
Current member records
Total / Rejected
```

### 3. `useI18n must be used inside I18nProvider`

The i18n provider was moved into `RootDocument` so all routed pages, including `/login` and error/catch rendering, are inside `I18nProvider`.

## Updated files

- `src/routes/__root.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/AccountMenu.tsx`
- `src/routes/admin.tsx`
- `src/styles.css`

## No database changes

No Supabase/database/election changes are included.

## QA

1. Run `npm run check`.
2. Run `npm run build`.
3. Open `/login` and confirm no `useI18n` provider error.
4. Login as admin.
5. Open avatar menu and confirm `Admin Panel` appears once.
6. Open `/admin`.
7. Confirm the old `Cleaner admin flow / Navigation moved to sidebar` text is gone.
8. Confirm account dropdown scroll still works.
