# Admin Shell Coverage Patch A

This patch wraps the remaining admin pages in the JAS application with the `AdminShell` component, ensuring the admin sidebar and layout remain consistent across the entire admin area.

## Updated pages

The following admin routes now use `AdminShell`:

* `/admin/cms`
* `/admin/cms/$slug`
* `/admin/committees/$id`
* `/admin/news`
* `/admin/news/$id`
* `/admin/gallery`
* `/admin/events`

Each page imports `AdminShell` from the admin components library and wraps its existing content inside a `<div className="admin-nested-page">` within the shell. The original page logic (data loading, forms, routing parameters, loaders and actions) remains unchanged. Appropriate titles and meaningful subtitles have been set for each page to describe the purpose of the admin screen. For example, the CMS list page now uses the subtitle “Manage multilingual public website pages.”, the CMS editor uses “Edit English, Urdu and Sindhi page content.”, the committee detail page uses “Manage committee information, members and designations.”, the News admin pages use “Create, edit and publish public news posts.” and “Create or update a public news post.” for the editor, the Gallery admin page uses “Upload and manage public gallery items.” and the Events admin page uses “Create and manage public events and meeting notices.”.

This patch also updates the `/admin/cms` route to detect nested CMS pages (`/admin/cms/$slug`) using TanStack Router’s `useRouterState`. When the path is not exactly `/admin/cms`, the page now returns an `<Outlet />` so that nested routes render their own content. The normalization of the pathname now only removes trailing slashes to match the pattern used in other admin index pages.

No database migrations, election files or membership card export changes are introduced. Styling in `styles.css` remains untouched, and large refactors have been avoided in accordance with the guidelines.
