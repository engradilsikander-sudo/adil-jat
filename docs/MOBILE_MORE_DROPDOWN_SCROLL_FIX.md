# Mobile More Dropdown Scroll Fix

This patch fixes the mobile `More` dropdown height.

## Problem

On mobile, the `More` dropdown list was taller than the visible screen. Lower items such as Gallery, Events and Contact could not be reached easily.

## Fix

- Added `site-more-menu` class hook to `MoreDropdown`.
- Added mobile max-height for the More dropdown.
- Enabled vertical scroll inside the dropdown.
- Added iOS-friendly `-webkit-overflow-scrolling: touch`.
- Made More menu rows more compact on mobile.
- Kept hamburger removed.
- Kept mobile second nav row unchanged.
- No database changes.
- No route tree changes.

## QA

Open on mobile:

1. Tap `More`.
2. Scroll inside the dropdown.
3. Confirm all items are reachable:
   - About JAS
   - Vision & Mission
   - Manifesto
   - Constitution
   - Central Working Committee
   - Committees
   - Gallery
   - Events
   - Contact
4. Confirm page behind does not need to scroll for the menu items.
