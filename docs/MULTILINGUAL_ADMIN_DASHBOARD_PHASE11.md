# Multilingual Admin Dashboard Phase 11

This phase localizes the main admin dashboard/control center.

## Updated files

- `src/lib/admin-dashboard-i18n.ts`
- `src/routes/admin.tsx`

## What changed

### Admin dashboard

The `/admin` dashboard now supports English, Urdu and Sindhi for:

- Loading state
- Header title/subtitle
- Admin role badges
- Sensitive data toggle
- Sensitive data warning
- Refresh action
- Membership stats cards
- Membership management heading
- Search/filter labels and placeholders
- Date/status filter labels
- Sort labels
- CSV export labels
- Table headings
- Empty state
- Mobile member cards
- Status badges
- Digital card access messages
- View Application button

### Admin module shortcuts

The Admin Modules / Control Center shortcut cards now support English, Urdu and Sindhi for:

- Section heading and description
- Access layer labels
- Available module count
- Membership module
- Education module
- Health module
- Welfare module
- Employment module
- Finance module
- Public Website CMS module
- News & Media module
- Reports Center
- Roles & Permissions
- Area Permissions
- Audit Logs
- Committees & Designations

## Scope

This phase focuses on the main `/admin` control center page.

It does not translate every deep admin workflow page yet, such as:

- `/admin/programs/education`
- `/admin/programs/health`
- `/admin/finance`
- `/admin/members/$id`
- `/admin/reports`

Those should be handled in a later admin-module phase.

## No database changes

No migration is required for this phase.
