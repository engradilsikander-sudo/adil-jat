# Multilingual Public CMS + Committees Phase 9

This phase localizes public organization/CMS UI, committees pages and public media page UI.

## Updated files

- `src/lib/public-page-i18n.ts`
- `src/routes/-cms-public-page.tsx`
- `src/routes/committees.tsx`
- `src/routes/committees/$id.tsx`
- `src/routes/news.tsx`
- `src/routes/events.tsx`
- `src/routes/gallery.tsx`

## What changed

### CMS public pages

The shared CMS public page component now has English / Urdu / Sindhi UI labels for:

- CTA buttons
- CMS status badge
- Sidebar cards
- Fallback content
- About
- Vision & Mission
- Manifesto
- Constitution
- CWC
- Contact

When a CMS page is not published, the fallback content is localized.

If a CMS page is already published in English from the database, the published database content is preserved exactly. Full database-driven multilingual CMS content can be added in a later phase.

### Committees

The public committees pages now have localized UI labels for:

- Public Committees heading
- Central / Divisional / District / Taluka filters
- Stats cards
- Search placeholder
- View Committee button
- Public committee detail page
- Office bearer info labels

Divisional committee UI support is included in the public filter/stat layer.

### Media pages

The following public pages now have localized headings, descriptions and state messages:

- `/news`
- `/events`
- `/gallery`

Dynamic news/event/gallery content from the database remains as entered in CMS/admin content.

## Not changed

- No database schema changes
- No Supabase RLS changes
- No admin CMS editor change
- No migration required

## Recommended next phase

Multilingual Admin CMS Editor Phase 10:

- Add language selector to CMS editor
- Store EN / UR / SD versions per CMS page
- Public page fetches matching language content
- Admin can manage translations from dashboard
