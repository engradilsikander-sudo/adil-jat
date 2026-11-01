# Patch I — Restore React Refresh Runtime for TanStack Start dev mode

## Why

The dev server failed with:

```text
TanStack Start React dev mode requires the React Refresh runtime, but /@react-refresh could not be resolved.
Add @vitejs/plugin-react or another compatible React Refresh Vite plugin to your Vite config.
```

Patch H removed `@vitejs/plugin-react` while trying to reduce duplicate React/HMR risk. TanStack Start still requires a compatible React Refresh runtime in dev mode.

## Changes

- Restored `@vitejs/plugin-react` import.
- Restored `viteReact()` in Vite plugins.
- Placed `viteReact()` before `tanstackStart()` so `/@react-refresh` can be resolved before the TanStack Start plugin checks for it.
- Kept devtools development-only.
- Kept React/TanStack dedupe and optimizeDeps stability settings.
- No database migration.

## Test

```bash
rm -rf node_modules/.vite .output .vinxi .tanstack
npm run check
npm run build
npm run dev
```

Then test `/admin`, `/admin/members/:id`, `/dashboard`, `/register`, and `/card`.
