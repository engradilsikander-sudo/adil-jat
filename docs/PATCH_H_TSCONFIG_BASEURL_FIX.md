# Patch H — TypeScript 6 baseUrl fix and Vite stability cleanup

## Purpose

Fix the TypeScript check error:

```text
Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
```

## Changes

- Removed `compilerOptions.baseUrl` from `tsconfig.json`.
- Kept `paths` aliases. In modern TypeScript, `paths` can be resolved relative to the tsconfig file without `baseUrl`.
- Kept `.vercel`, `.vinxi`, and `.tanstack` in `exclude`.
- Removed the extra `@vitejs/plugin-react` import and `viteReact()` from `vite.config.ts` to avoid duplicate React/HMR handling in TanStack Start.
- Kept explicit Vite aliases for `#` and `@`.
- Kept React/TanStack Router dedupe and optimizeDeps stabilization.

## Test

```bash
rm -rf node_modules/.vite .output .vinxi .tanstack
npm run check
npm run build
npm run dev
```
