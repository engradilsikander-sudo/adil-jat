# Admin Sidebar Layout Phase 2

This patch extends the shared `AdminShell` sidebar layout to important nested admin pages.

## Wrapped pages

- `/admin/members/$id`
- `/admin/finance`
- `/admin/reports`
- `/admin/roles`
- `/admin/committees`
- `/admin/designations`
- `/admin/area-permissions`
- `/admin/audit-logs`

## What changed

These pages now render inside:

```tsx
<AdminShell>
  ...
</AdminShell>
```

This keeps admin navigation consistent after leaving the main `/admin` dashboard.

## Added CSS

- `admin-nested-page`
- nested `page-wrap` width normalization
- mobile nested page polish

## Not included yet

Program-specific admin pages are left for the next phase:

- `/admin/programs/education`
- `/admin/programs/health`
- `/admin/programs/welfare`
- `/admin/programs/employment`

## No database changes

No Supabase/database/election changes are included.

## QA

1. Open `/admin`.
2. Click Finance, Reports, Roles, Committees, Designations, Area Permissions, Audit Logs.
3. Confirm sidebar stays visible on desktop.
4. Open member detail from the members table.
5. Confirm member detail also uses admin shell.
6. Test mobile drawer on each wrapped page.
7. Confirm there is no horizontal scroll.
