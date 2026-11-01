# Patch — APK / PWA cache reset and loading-stuck fix

## Problem

The installed APK/TWA can keep an old service worker, old JS/CSS chunks, or old Cache Storage entries. When the deployed app changes, Android can keep loading the stale cached bundle and the app may stay on the loading screen.

## What changed

- Added `src/lib/pwa-cache-reset.ts` for shared browser cache/service-worker cleanup.
- Added `src/components/pwa/AppUpdateReset.tsx`, a small installed-app reset helper with a manual cache reset action.
- Mounted the reset helper in `src/routes/__root.tsx` beside `PwaBootstrap`.
- Updated `src/components/layout/PwaBootstrap.tsx` to reuse the shared reset helpers.
- Updated `public/sw.js` to `v6-apk-cache-reset-fix`.
- Added service-worker-level handling for emergency reset URLs such as:

```txt
https://jasofficial.org/?clear-pwa-cache=1
```

This is important because it works even when React is stuck and cannot run normal app code.

- Changed navigation, JS, CSS and mutable public assets to network-first with `cache: 'no-store'`/`reload` behavior.
- Made explicit reset delete all Cache Storage entries and unregister the current service worker.
- Kept image/font/static assets cache-friendly.
- Added no-cache Vercel header for `assetlinks.json` as well as SW/manifest/offline files.

## Test

```bash
npm run check
npm run build
```

## Production recovery steps

After deploy, open this URL once on the affected Android device/browser:

```txt
https://jasofficial.org/?clear-pwa-cache=1
```

If the APK still shows old data, then also clear Android app data:

```txt
Android Settings → Apps → JAS → Storage → Clear Cache → Clear Data
```

Then open the APK again.

## Verify headers

```bash
curl -I https://jasofficial.org/sw.js
curl -I https://jasofficial.org/manifest.json
curl -I https://jasofficial.org/.well-known/assetlinks.json
```

Expected:

```txt
cache-control: no-cache, no-store, must-revalidate
```
