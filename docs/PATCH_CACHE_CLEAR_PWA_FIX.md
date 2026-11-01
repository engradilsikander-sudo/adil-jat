# Patch — PWA cache clear and hard refresh fix

## Problem found

The old service worker used a cache-first strategy for scripts, styles, images, manifest and `/jas/*` assets while keeping a static cache name. This can keep the installed PWA or mobile browser on old files even after a new deploy.

## What changed

- Bumped the service worker cache name to `jas-pwa-v5-cache-clear-fix`.
- Added `skipWaiting()` during install and `clients.claim()` during activate.
- Added old JAS cache deletion during activation.
- Changed `/jas/*`, `manifest.json`, and `offline.html` to network-first so mutable public assets refresh properly.
- Kept hashed build assets cache-first with background refresh for performance.
- Registered `/sw.js` with `updateViaCache: 'none'` so the browser does not reuse a cached service worker file.
- Added emergency URL cache clear support:

```txt
https://your-domain.com/?clear-pwa-cache=1
```

Open that URL once in the affected browser/PWA. It deletes JAS caches, unregisters the current service worker, then reloads with a clean URL.

- Added Vercel headers so `sw.js`, `manifest.json`, and `offline.html` are not CDN/browser cached.
- Added local dev/build cache cleanup command:

```bash
npm run clean:cache
```

## Local test

```bash
npm run clean:cache
npm run check
npm run build
npm run dev
```

## Production test after deploy

```bash
curl -I https://your-domain.com/sw.js
```

Expected header:

```txt
cache-control: no-cache, no-store, must-revalidate
```

Then open:

```txt
https://your-domain.com/?clear-pwa-cache=1
```

After it reloads, the app should use the latest files.
