# Remaining UI Polish Pack

This combined patch completes the remaining UI-only improvements requested after the admin sidebar work.

## Included parts

### 1. Admin Programs Sidebar Integration Phase 3

Wrapped these admin program pages with `AdminShell` so the admin sidebar remains visible:

- `/admin/programs/education`
- `/admin/programs/health`
- `/admin/programs/welfare`
- `/admin/programs/employment`

### 2. Admin Member Detail Approval Polish

Improved the admin member detail approval area:

- Added an approval verification checklist.
- Added a manual payment receipt/status reminder.
- Improved mobile spacing for review actions.
- Added CSS hooks for future UI adjustments.

### 3. Card Page UI Shell Polish

Important: the actual exported membership card design/content was not changed.

Improved only the card page shell:

- Added card page layout hooks.
- Improved preview/sidebar responsiveness.
- Added multilingual download guidance text.
- Improved download button layout on mobile.

### 4. Program Apply Forms Final QA

Added safe mobile/RTL polish hooks for:

- Education apply form
- Health apply form
- Welfare apply form
- Employment apply form

Improved:

- Mobile form spacing
- Input/select/textarea overflow handling
- Submit button responsiveness
- RTL field alignment
- Document/upload section layout safety

## Not included

No database changes.

No election files.

No route tree changes.

No membership card exported design/content changes.

No styles.css split yet.

## QA checklist

1. Run `npm run check`.
2. Run `npm run build`.
3. Open `/admin/programs/education`.
4. Open `/admin/programs/health`.
5. Open `/admin/programs/welfare`.
6. Open `/admin/programs/employment`.
7. Confirm admin sidebar remains visible on desktop.
8. Confirm admin drawer works on mobile.
9. Open `/admin/members/$id` from members table.
10. Confirm approval checklist appears for pending members.
11. Confirm approve/reject buttons still work.
12. Open `/card`.
13. Confirm card preview/download UI still works.
14. Download front/back/both card images.
15. Confirm exported card design/content is unchanged.
16. Open program apply forms and test mobile layout.
17. Switch Urdu/Sindhi and confirm RTL layout is not broken.
