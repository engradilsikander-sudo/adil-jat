# Multilingual Dashboard + Header RTL Fix Phase 2

## Purpose

This patch improves the Phase 1 multilingual foundation by fixing the visible layout issues found after switching to Urdu or Sindhi.

## What changed

- Keeps the application shell layout stable in LTR while still storing the selected text direction in `body[data-direction]`.
- Prevents Urdu/Sindhi from reversing the dashboard cards, hero layout, and header controls.
- Keeps the header itself LTR-safe so the logo, nav, language switcher, avatar and menu button do not jump sides unexpectedly.
- Changes desktop header breakpoints from `md` to `lg` to reduce tablet/header crowding after adding the language switcher.
- Adds dashboard translation keys for English, Urdu and Sindhi.
- Translates key dashboard labels, CTA buttons, profile labels, quick actions, program summary labels, donation panel labels and notification headings.
- Keeps member numbers, dates, account numbers and IDs direction-safe with LTR spans where needed.
- Keeps the membership payment QR panel compact inside the sidebar.

## Notes

This patch does not translate every admin/program page. It focuses on the header and dashboard because those are the most visible issues after Phase 1.

Recommended next phases:

1. Login / Signup / Register multilingual text.
2. Membership card and verification pages.
3. Admin panel labels and tables.
4. CMS/database content multilingual model.
