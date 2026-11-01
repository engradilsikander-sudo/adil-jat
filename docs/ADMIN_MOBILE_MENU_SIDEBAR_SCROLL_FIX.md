# Admin Mobile Menu + Sidebar Scroll Fix

This patch fixes two mobile admin UI issues.

## Fixed

### 1. Duplicate Admin Panel item in avatar menu

Admin users were seeing `Admin Panel` twice in the avatar menu:

- top Admin Panel item from admin shortcuts
- duplicate Admin Panel from the normal dashboard/member menu

The duplicate member-dashboard item is now filtered out for admin users.

### 2. Admin sidebar drawer not scrolling on mobile

The mobile admin drawer now has:

- fixed viewport height
- internal scroll area
- iOS/Safari friendly scroll
- safe bottom padding for browser bars
- sticky drawer header
- scrollable sidebar content

## Updated files

- `src/components/layout/Header.tsx`
- `src/components/admin/AdminShell.tsx`
- `src/styles.css`

## No database changes

No Supabase/database/election changes are included.

## QA

1. Login as admin on mobile.
2. Tap avatar.
3. Confirm `Admin Panel` appears only once.
4. Open `/admin`.
5. Tap admin menu button.
6. Scroll inside the drawer.
7. Confirm all sidebar groups/items are reachable.
