# Patch — CSS Split Phase 1

Branding remains unchanged: **JAS — Jatt Alliance Sindh**.

## Goal

The former `src/styles.css` file was nearly 3,000 lines and mixed global tokens, layout, public-page styles, form styles, card styles, PWA/mobile patches, admin sidebar styles, and final UI polish in a single file.

This patch turns `src/styles.css` into a small ordered stylesheet entrypoint and moves the CSS into focused files under `src/styles/`.

## Changed files

- `src/styles.css`
- `src/styles/base.css`
- `src/styles/layout.css`
- `src/styles/cards.css`
- `src/styles/forms.css`
- `src/styles/public.css`
- `src/styles/pwa.css`
- `src/styles/mobile.css`
- `src/styles/admin.css`
- `src/styles/polish.css`
- `docs/PATCH_CSS_SPLIT_PHASE1.md`

## Import order

The new `src/styles.css` keeps imports ordered to preserve the original cascade from the previous single-file stylesheet:

1. Tailwind and font imports
2. Base tokens/reset/accessibility
3. Layout/header/buttons/typography
4. Cards
5. Forms
6. Public/shared UI utilities
7. PWA safe-area rules
8. Mobile polish rules
9. Admin shell/sidebar rules
10. Remaining final polish rules

## Validation

Run:

```bash
npm run check
npm run build
```

Both commands should pass without route or visual behavior changes.

## Manual QA

Check these areas after applying:

1. Home page header/nav and hero
2. Login/signup/forgot-password/reset-password pages
3. Register page form fields and upload sections
4. Dashboard cards and quick links
5. Member card / office bearer card pages
6. Admin dashboard and sidebar on desktop
7. Admin sidebar/mobile menu on small screens
8. PWA install/update/reset banners

## Notes

This patch is intentionally a structure-only refactor. It does not rename CSS classes, change branding, or alter UI behavior.
