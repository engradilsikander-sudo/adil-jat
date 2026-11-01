# Patch G — Vite and TypeScript stability

## Changes

1. Removed unsupported `resolve.tsconfigPaths` usage from Vite config.
2. Added explicit Vite aliases for `#/*` and `@/*` to `src`.
3. Added Vite `resolve.dedupe` for React and TanStack Router packages.
4. Added `optimizeDeps.include` for React, TanStack Router, router-core SSR helpers, and `seroval`.
5. Kept `devtools()` development-only.
6. Kept TanStack Start + Nitro + React plugin order stable.
7. Added `baseUrl` to `tsconfig.json`.
8. Excluded `.vercel`, `.vinxi`, and `.tanstack` from TypeScript checks.

## Notes

After applying this patch, clear Vite/TanStack generated caches before running dev server:

```bash
rm -rf node_modules/.vite .output .vinxi .tanstack
```
