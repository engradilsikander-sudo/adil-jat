# Patch B — Admin Management Multilingual Pack

This patch adds English, Urdu and Sindhi UI labels to admin management pages.

## Updated pages

- `/admin/finance`
- `/admin/reports`
- `/admin/roles`
- `/admin/area-permissions`
- `/admin/audit-logs`
- `/admin/committees`
- `/admin/designations`

## Added helper

- `src/lib/admin-management-i18n.ts`

## What changed

This patch localizes key admin management UI labels, including:

- page badges, titles and subtitles
- back links
- refresh buttons
- export buttons
- stat cards
- search placeholders
- empty/loading states
- major form labels
- create/edit/save controls
- active/inactive badges
- committee and designation labels

## Preserved behavior

This patch does not change:

- Supabase queries
- RLS policies
- database schema
- finance approval logic
- reports calculations
- role assignment logic
- area permission logic
- audit log fetch/export logic
- committee/designation create/update logic

## Notes

This patch focuses on visible admin management UI. Some dynamic values that come from the database or helper option arrays remain as originally stored/generated.
