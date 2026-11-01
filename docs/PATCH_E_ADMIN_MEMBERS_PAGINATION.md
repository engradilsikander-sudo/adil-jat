# Patch E — Admin Members Pagination

## Purpose

Patch B intentionally limited `/admin` member list to 50 records for faster first load. This patch adds server-side pagination controls so admins can browse the next/previous 50 matching member records without loading every member at once.

## Changes

- Adds member page state to `/admin`.
- Uses Supabase `.range(from, to)` for unrestricted admin member queries.
- Keeps restricted-area fetch guarded with a capped fetch limit and client-side area filtering.
- Adds a pagination summary: `Showing X-Y of Z records · Page A of B`.
- Adds `Previous 50` and `Next 50` buttons.
- Resets pagination back to page 1 when search, filters, or sort are changed.
- Keeps list photos disabled on the admin table for performance.
- No database migration.

## Test

1. Open `/admin`.
2. Confirm first page shows latest 50 records.
3. Click `Next 50` and confirm records 51-100 load.
4. Click `Previous 50` and confirm first 50 return.
5. Search by name/CNIC/mobile/member number and confirm page resets to page 1.
6. Change status/district/taluka/date/sort filters and confirm page resets to page 1.
7. Open a member application and card from page 2.
