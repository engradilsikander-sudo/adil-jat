# Admin Dashboard De-duplication Phase 1.1

This patch cleans the `/admin` dashboard after the admin sidebar was introduced.

## Problem

After adding the sidebar, the admin dashboard still showed large module navigation cards. This created duplicate navigation:

```txt
Sidebar = full admin navigation
Dashboard cards = same module navigation repeated
```

## Fix

The sidebar remains the primary navigation.

The dashboard is now focused on:

```txt
Priority work
Compact quick actions
Membership review summary
Admin access context
```

## Updated files

- `src/routes/admin.tsx`
- `src/styles.css`
- `docs/ADMIN_DASHBOARD_DEDUPLICATION_PHASE1_1.md`

## What changed

### Removed/reduced

Large duplicate module cards were removed from the admin dashboard.

Removed from dashboard card grid:

```txt
Education
Health
Welfare
Employment
Finance
Public Website CMS
News & Media
Reports Center
Roles & Permissions
Area Permissions
Audit Logs
Committees
```

These are still available from the left sidebar.

### Added

A lighter overview section:

```txt
Admin work queue
- Pending applications
- Approved members
- Cards issued

Cleaner admin flow note
- Total members
- Rejected members

Quick actions
- Review pending members
- Finance
- Reports
- News
- CMS
- Committees
```

### Multilingual

The new dashboard overview labels support:

```txt
English
Urdu
Sindhi
```

## No database changes

This patch does not add migrations or schema changes.

## No election files

Election patches remain untouched.

## QA checklist

1. Open `/admin`.
2. Confirm left sidebar still appears.
3. Confirm large duplicate module cards are gone.
4. Confirm dashboard now shows work queue + compact quick actions.
5. Click `Review pending members`.
6. Confirm member table filters to pending applications.
7. Click Finance / Reports / News / CMS / Committees quick actions.
8. Switch Urdu/Sindhi and confirm overview labels change.
9. Confirm members table still works.
10. Confirm no horizontal scroll on mobile.
