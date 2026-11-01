# Patch M — PWA Direct Install Prompt Only

This patch removes the manual install-steps fallback banner and only shows the PWA install banner when the browser provides the native `beforeinstallprompt` event.

## Changes

- Replaced fallback "Install steps" behavior with a direct "Install JAS App" action.
- Install banner now appears only when the native browser install prompt is available.
- Clicking "Install JAS App" opens the browser's native install dialog.
- Keeps update prompt behavior for installed/open PWA sessions.
- Keeps development service worker safety cleanup.
- No database migration.

## Note

Browsers do not allow websites to force-open the PWA install dialog unless the browser has fired `beforeinstallprompt`. On localhost/dev, the prompt may not appear because the service worker is intentionally disabled for development safety. Test native install on production HTTPS after deployment.
