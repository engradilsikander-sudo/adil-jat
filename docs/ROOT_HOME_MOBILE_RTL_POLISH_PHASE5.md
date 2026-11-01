# Final Root/Home Mobile RTL Polish Phase 5

This patch adds final mobile and RTL polish for the cleaned root header and multilingual home page.

## Scope

This patch focuses on UI polish only.

It does not add:

- database changes
- election files
- route tree changes
- membership card/export changes
- Supabase changes

## Updated files

- `src/styles.css`
- `src/components/layout/Header.tsx`
- `src/components/layout/AccountMenu.tsx`
- `src/components/layout/ProgramsDropdown.tsx`
- `src/components/layout/MoreDropdown.tsx`
- `src/routes/index.tsx`

## What changed

### Header polish

- Added CSS hooks for desktop and mobile header actions.
- Improved mobile header spacing.
- Reduced mobile logo width on small screens.
- Improved Language Switcher fit on narrow mobile.
- Improved avatar menu width and max-height.
- Added RTL-aware account menu alignment.
- Added RTL-aware Programs dropdown alignment.
- Added RTL-aware More dropdown alignment.

### Home page polish

- Added home page CSS hooks:
  - `home-page`
  - `home-page-wrap`
  - `home-hero`
  - `home-hero-title`
  - `home-hero-actions`
  - `home-stat-grid`
  - `home-card-preview`
  - `home-card-preview-body`
  - `home-card-preview-info`
  - `home-final-cta`

- Improved mobile spacing.
- Improved hero title scaling on small screens.
- Improved Urdu/Sindhi title line-height.
- Made hero CTA buttons full-width on mobile.
- Made Final CTA buttons full-width on mobile.
- Protected card preview from RTL layout reversal.
- Reduced card preview grid width on small screens.
- Added overflow protection to prevent horizontal scroll.

## QA checklist

### Desktop

- Header logo should not overflow.
- Programs dropdown opens normally.
- More dropdown opens normally.
- Avatar/account menu opens normally.
- Home hero layout remains two-column on large screens.
- Home CTA buttons remain aligned.

### Mobile

- Header should show only:
  - Logo
  - Language switcher
  - Avatar

- No hamburger/X button.
- No horizontal scroll.
- Avatar menu should fit within viewport.
- Language switcher should remain clickable.
- Hero title should not overflow.
- Hero buttons should be full-width.
- Final CTA buttons should be full-width.
- Card preview should not overflow.

### RTL

Test Urdu and Sindhi:

- Account menu text aligns right.
- Programs dropdown text aligns right.
- More dropdown text aligns right.
- Home headings align right.
- Hero CTA buttons align cleanly.
- Official card preview remains LTR/stable.
