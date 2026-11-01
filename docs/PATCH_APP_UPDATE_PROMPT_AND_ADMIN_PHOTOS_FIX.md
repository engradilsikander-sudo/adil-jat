# Patch: App update helper + admin member photos fix

## Problems fixed

1. The bottom-left helper text `Loading stuck or old version? Reset app cache and reload latest files.` was shown automatically in every installed APK/PWA session. It is now only shown when explicitly requested through a debug/reset URL.
2. Admin members list photo column used `src={undefined}`, so member photos always displayed the fallback broken-image placeholder.

## Updated behavior

- Normal app usage no longer shows the cache reset helper repeatedly.
- Emergency cache reset still works with:
  - `/?clear-pwa-cache=1`
  - `/?show-cache-reset=1`
  - `/?debug-pwa=1`
- Admin members list now creates signed URLs from the `member-photos` bucket for visible member rows.
- Mobile and desktop admin member rows both show member photos when uploaded.
- Image fallback still appears if a member has no photo or the signed URL cannot be loaded.

## Files changed

- `src/components/pwa/AppUpdateReset.tsx`
- `src/components/layout/PwaBootstrap.tsx`
- `src/lib/pwa-cache-reset.ts`
- `src/routes/__root.tsx`
- `src/routes/admin.tsx`
- `public/sw.js`
- `vercel.json`
