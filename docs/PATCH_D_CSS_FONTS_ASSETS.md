# Patch D — CSS, Fonts and PWA Asset Optimization

## Summary

This patch reduces route/component weight and avoids unnecessary install-time asset caching.

## Changes

1. Extracted the large inline CSS string from `src/routes/register.tsx` into `src/routes/register.css`.
2. Removed the duplicate Google Fonts import from the register route styles.
3. Reused global font tokens from `src/styles.css` via `var(--font-body)` and `var(--font-display)`.
4. Optimized PWA PNG icons:
   - `public/icon-192.png`
   - `public/icon-512.png`
   - `public/apple-touch-icon.png`
5. Updated service worker cache name to `jas-pwa-v2`.
6. Removed heavy `icon-512.png` and `apple-touch-icon.png` from service worker install pre-cache.

## Notes

The manifest still references the 512px icon for PWA install quality. The service worker simply does not force-cache it during first install.
