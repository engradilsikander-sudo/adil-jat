# Patch B — Admin loading optimization

This patch improves `/admin` membership dashboard loading performance without adding database migrations.

## Changes

1. Loads a maximum of 50 matching member records for the admin members table.
2. Applies status, district, taluka, date, search and sort conditions at the Supabase query level before limiting rows.
3. Debounces the search input by 350ms to avoid firing a request on every key press.
4. Removes list-page signed photo URL generation, which previously created one Storage signed URL request per member row.
5. Keeps member photos available on detail/card pages; the list page now shows a lightweight placeholder instead of loading thumbnails.
6. Reuses the already-loaded admin user id and roles when checking membership area access, reducing duplicate auth/role lookups.
7. Keeps refresh behavior and adds silent refresh after the first load so filtering/searching does not replace the whole page with a loader.

## Notes

- The admin dashboard metrics are now based on the loaded matching records shown in the current admin table context.
- Restricted area admins fetch a slightly larger server batch internally and then keep the first 50 accessible rows after area filtering.
- No database migration is included.
