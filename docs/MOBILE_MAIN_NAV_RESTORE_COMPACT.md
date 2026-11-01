# Mobile Main Navigation Restore + Compact Header Patch

This patch combines both requested mobile fixes:

1. Mobile Header + Avatar Menu Compact Fix
2. Mobile Main Navigation Restore Patch

## Scope

UI/header polish only.

This patch does not add:

- database changes
- election files
- route tree changes
- dashboard/register logic changes
- home page content changes

## Updated files

- `src/components/layout/Header.tsx`
- `src/components/layout/AccountMenu.tsx`
- `src/styles.css`

## What changed

### Mobile main navigation restored

Mobile header now uses two rows:

```text
Row 1: Logo | Language | Avatar
Row 2: Home | Programs | Donate | News | More
```

This keeps hamburger/X removed while making main navigation visible again.

### Header compact fixes

- Mobile brand title uses shorter text for English: `Jatt Alliance`
- Full `Jatt Alliance Sindh` remains on larger screens
- Mobile logo width reduced safely
- Logo icon size reduced on small screens
- Language switcher spacing reduced
- Avatar button reduced from large mobile size to compact mobile size

### Avatar/account menu compact fixes

- Account menu width slightly reduced
- Menu row padding reduced
- Icon boxes reduced
- Menu label size reduced
- Logout button height reduced
- Menu max-height remains viewport safe

## Final mobile header target

```text
Jatt Alliance | EN اردو سنڌي | Avatar
Home | Programs | Donate | News | More
```

## QA checklist

### Mobile width 360–430px

- Logo should not badly truncate.
- `Home | Programs | Donate | News | More` should be visible.
- No hamburger/X button should appear.
- Language switcher should remain clickable.
- Avatar should open account menu.
- Account menu rows should be more compact.
- Programs dropdown should open from mobile nav.
- More dropdown should open from mobile nav.
- No horizontal scroll should appear.

### Desktop

- Desktop navbar should remain unchanged.
- Desktop Programs dropdown should work.
- Desktop More dropdown should work.
- Desktop avatar/account menu should work.
