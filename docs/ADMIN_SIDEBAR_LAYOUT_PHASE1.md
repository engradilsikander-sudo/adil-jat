# Admin Sidebar Layout Phase 1

This patch adds the first shared admin sidebar layout.

## Scope

This phase updates the root admin dashboard only:

```txt
/admin
```

Nested admin pages still render through their existing route pages. They can be wrapped into `AdminShell` gradually in Phase 2.

## Added files

- `src/components/admin/AdminShell.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/config/admin-navigation.tsx`

## Updated files

- `src/routes/admin.tsx`
- `src/styles.css`

## What changed

### Admin shell

A shared `AdminShell` component was added.

Desktop layout:

```txt
Sidebar | Admin content
```

Mobile layout:

```txt
Admin mobile bar
Drawer menu button
Admin content
```

### Sidebar

The sidebar groups admin modules into clear sections:

```txt
Overview
Membership
Programs
Organization
Finance & Reports
Public CMS
```

### Mobile drawer

On mobile/tablet, sidebar becomes a drawer opened from the Admin mobile bar.

### Safe future modules

Future modules such as Program Appointments and Elections are shown as disabled/locked items so they do not break the current build before those routes are added.

## No database changes

This patch does not add migrations or schema changes.

## No election files

Election patches remain untouched.

## QA checklist

1. Open `/admin` on desktop.
2. Confirm sidebar appears on the left.
3. Click Education / Health / Welfare / Employment links.
4. Click Committees / Designations / Roles / Area Permissions.
5. Click Finance / Reports / Audit Logs.
6. Click CMS / News / Gallery / Events.
7. Open `/admin` on mobile.
8. Confirm mobile admin bar appears.
9. Tap menu button.
10. Confirm admin drawer opens.
11. Tap a sidebar link and confirm drawer closes.
12. Confirm `/admin/members/$id` still opens normally from the members table.
