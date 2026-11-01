# Patch S — APK mobile card and admin fixes

## Fixes

1. Admin members list now loads signed photo URLs for the visible/page records.
2. Mobile and desktop admin member list use the signed member photo URL instead of forcing the placeholder.
3. Member photo component now falls back only when no URL exists or the image fails.
4. Card preview scale calculation now caps the available width by the actual mobile viewport.
5. Card preview panels now use `min-w-0` and overflow containment so the 1280px card cannot force the page wider than the APK viewport.
6. Download card buttons now use full-width mobile-safe styles with explicit readable text colors.
7. No database migration.

## Why this was needed

The APK/TWA uses a narrow mobile viewport. The card preview shell is a 1280px design scaled down for preview. Without stronger mobile containment, the card could force the layout wider than the screen, making the preview look cut and pushing button text off-screen. Admin photos were also intentionally skipped in a previous performance patch, which made the mobile admin list show image placeholders.
