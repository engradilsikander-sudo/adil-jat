# Multilingual Admin Member Detail Phase 12

This phase localizes the admin member application detail page.

## Updated routes

- `/admin/members/$id`

## Added files

- `src/lib/admin-member-detail-i18n.ts`

## What changed

The admin member detail/application page now supports English, Urdu and Sindhi labels for:

- Loading and not-found states
- Back to admin link
- Page heading and member summary labels
- Refresh / View Card / Office Bearer Card controls
- Digital card availability guidance
- Summary cards
- Quick contact card
- Admin verification notice
- Member detail sections
- Identity / Location / Profile / Emergency Contact / Review Record labels
- Rejection reason block
- Review Application section
- Approve / Reject action buttons
- Review completed section
- Status panel and status badges
- No photo / not provided / not issued labels

## Preserved behavior

This phase does not change:

- approval action
- rejection action
- member fetch logic
- Supabase queries
- photo signed URL logic
- membership card generation
- designation card flow

## Not included

This phase does not translate the exported membership card design/content. That remains intentionally unchanged as an official ID card document.
