# Admin Avatar Dropdown Scroll Fix

This patch fixes the admin avatar dropdown on mobile and desktop.

## Fixed

### 1. Duplicate/extra admin menu items

Admin users were seeing:

```txt
Admin Panel
Members
Programs
Donations
Reports
Admin Panel
Digital Card
Office Bearer Card
Updates
Donors
Register
```

The avatar menu now keeps only one `Admin Panel` item and removes the extra admin shortcuts from the avatar dropdown.

The admin sidebar remains the primary place for:

```txt
Members
Programs
Donations
Reports
```

### 2. Dropdown scroll behavior

When a dropdown was open, trying to scroll inside it could scroll the page behind it.

This patch:

- locks background body scroll on mobile while a header dropdown is open
- preserves the current page scroll position
- enables internal dropdown scrolling
- adds iOS/Safari-friendly scrolling
- keeps logout reachable inside the avatar menu

## Updated files

- `src/components/layout/Header.tsx`
- `src/components/layout/AccountMenu.tsx`
- `src/styles.css`

## No database changes

No Supabase/database/election changes are included.

## QA

1. Login as admin.
2. Tap/click avatar.
3. Confirm `Admin Panel` appears only once.
4. Confirm `Members`, `Programs`, `Donations`, `Reports` are not duplicated in avatar menu.
5. Confirm `Digital Card`, `Office Bearer Card`, `Updates`, `Donors`, `Register`, `Logout` are reachable.
6. Scroll inside the avatar dropdown.
7. Confirm the page behind does not scroll.
8. Test More dropdown and Programs dropdown on mobile.
