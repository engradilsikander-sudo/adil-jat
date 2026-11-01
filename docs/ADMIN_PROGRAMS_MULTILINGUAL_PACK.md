# Patch A — Admin Programs Multilingual Pack

This patch localizes the admin-facing program review/list/detail pages for English, Urdu and Sindhi.

## Updated admin program areas

Education:
- `/admin/programs/education`
- `/admin/programs/education/$id`

Health:
- `/admin/programs/health`
- `/admin/programs/health/$id`

Welfare:
- `/admin/programs/welfare`
- `/admin/programs/welfare/$id`

Employment:
- `/admin/programs/employment`
- `/admin/programs/employment/$id`

## Added helper

- `src/lib/admin-programs-i18n.ts`

## What changed

The following user-facing labels now use language-aware copy:

- Back to Admin / Back to Program Admin
- Admin page badge/title/subtitle
- Export CSV
- Refresh
- Stats cards
- Search placeholders
- Filter defaults
- Review buttons
- Common field labels
- Detail page headings
- Review/approval section headings
- Document verification headings
- Save/assign/reviewer controls

## Preserved behavior

This patch does not change:

- Supabase queries
- review/approval logic
- document verification logic
- CSV export logic
- reviewer assignment logic
- RLS policies
- database schema

## Notes

Some database-driven values, such as case type values and admin-entered remarks, are preserved exactly as stored in the database.

Run local checks after applying:

```bash
npm run check
npm run build
```
