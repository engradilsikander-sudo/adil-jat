# Performance Code Splitting Phase 1

This phase keeps route behavior unchanged and focuses on reducing the largest initial client chunks.

## What changed

- Added Vite manual vendor chunks for React, TanStack, Supabase, icons, QR code generation, and card export dependencies.
- Moved `html-to-image` behind a dynamic import through `src/lib/shared/card-export.ts` so card export code loads only when a PNG download is requested.
- Added `src/lib/shared/qrcode.ts` and moved QR generation behind a dynamic import so QR code code is loaded only on card/verification workflows.
- Kept all RLS, Supabase queries, routes, and UI behavior unchanged.

## Verify

Run:

```bash
npm run check
npm run build
npm run qa
```

Then compare the client build output. The main `index-*.js` chunk should be smaller, while vendor chunks such as `vendor-tanstack-router`, `vendor-supabase`, `vendor-qrcode`, and `vendor-card-export` may appear separately.

## Notes

A large chunk warning can still appear if one vendor package is large, but splitting improves browser caching and avoids repeatedly shipping every heavy dependency with the app shell.

Future performance phases can add route-level component extraction and additional dynamic imports for admin-only modules.
