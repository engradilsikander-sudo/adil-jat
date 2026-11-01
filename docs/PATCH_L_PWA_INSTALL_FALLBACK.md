# Patch L — PWA install fallback prompt

This patch improves the custom install prompt visibility.

## Changes

- Keeps the native browser install prompt when `beforeinstallprompt` fires.
- Adds a fallback install banner when the browser does not fire `beforeinstallprompt`.
- The fallback button shows manual install instructions for desktop, Android, and iOS.
- The update prompt still has priority over the install prompt.
- Installed/standalone PWA mode hides the install prompt.
- No database migration.

## Why

Some browsers do not fire `beforeinstallprompt`, and local dev intentionally unregisters the service worker. Without a fallback, the custom “Install JAS App” banner may never appear.
