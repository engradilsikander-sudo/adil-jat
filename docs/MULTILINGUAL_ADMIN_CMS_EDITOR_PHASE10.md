# Multilingual Admin CMS Editor Phase 10

This phase adds language-wise CMS content management for English, Urdu and Sindhi.

## Updated files

- `src/lib/cms.ts`
- `src/lib/public-page-i18n.ts`
- `src/routes/-cms-public-page.tsx`
- `src/routes/admin/cms.tsx`
- `src/routes/admin/cms/$slug.tsx`
- `supabase/migrations/20260604195000_multilingual_cms_phase10.sql`

## What changed

### Database

The CMS table now supports one record per page slug per language.

Old structure:

```text
slug unique
```

New structure:

```text
slug + language unique
```

Supported CMS languages:

```text
en
ur
sd
```

Old `roman_ur` records are converted to `ur`.

### Admin CMS list

`/admin/cms` now shows each CMS page with English / Urdu / Sindhi rows.

For every language row, admins can:

- see whether a record is missing / draft / published / archived
- open editor for that exact language
- view public page if that language version is published

### Admin CMS editor

`/admin/cms/$slug` now supports language selection.

Admins can manage separate content for:

- English
- Urdu
- Sindhi

When a language record does not exist, the editor pre-fills localized fallback content and lets the admin save it as a new record.

### Public CMS page

The public page now fetches the CMS record matching the selected app language.

If no published record exists for the selected language, localized fallback content is shown.

## Apply order

1. Apply patch files
2. Run Supabase migration
3. Run type/build checks

## No changes

This phase does not change admin roles, RLS policies or public routes.
