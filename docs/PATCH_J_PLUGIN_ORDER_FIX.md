# Patch J — Fix TanStack Start / React plugin order

## Problem

`npm run build` and `npm run dev` failed with:

```text
Plugin order error: '@vitejs/plugin-react' is placed before '@tanstack/router-plugin'.
The TanStack Router plugin must come BEFORE JSX transformation plugins.
```

Patch I restored React Refresh, but placed `viteReact()` before the TanStack Start/router plugin. TanStack Router requires its plugin to run before JSX transformation.

## Fix

`vite.config.ts` now keeps `@vitejs/plugin-react` for React Refresh, but places it after `tanstackStart()`:

```ts
plugins: [
  ...(isDev ? [devtools()] : []),
  tailwindcss(),
  tanstackStart(),
  viteReact(),
  nitro(),
]
```

## Files changed

```text
vite.config.ts
```

## Test

```bash
rm -rf node_modules/.vite .output .vinxi .tanstack
npm run check
npm run build
npm run dev
```
