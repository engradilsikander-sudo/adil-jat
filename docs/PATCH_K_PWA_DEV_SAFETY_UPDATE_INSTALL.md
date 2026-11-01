# Patch K — PWA dev safety, update prompt and install button

## Scope

This patch improves the JAS PWA bootstrap layer without changing routes, Supabase logic or database schema.

## Changes

- Service worker registration now runs only in production.
- Development mode unregisters existing service workers and clears old caches to avoid stale local assets.
- Added an in-app update prompt when a new service worker version is available.
- Added a Refresh button that activates the waiting service worker and reloads the app.
- Added a custom Install JAS App prompt using the browser `beforeinstallprompt` event.
- Installed PWA users will see the same update prompt when the app detects a new deployed version.
- Service worker cache name bumped from `jas-pwa-v2` to `jas-pwa-v3`.
- Service worker now waits for user confirmation before calling `skipWaiting`.

## Notes

Browser/OS push notifications are not included in this patch. The update notification is an in-app PWA update prompt that also appears inside the installed app.
