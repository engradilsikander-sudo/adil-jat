# Multilingual Program Tracking Phase 7

This phase adds multilingual support for user-facing program tracking pages.

## Updated routes

Education:
- `/programs/education/my-applications`
- `/programs/education/$id`

Health:
- `/programs/health/my-applications`
- `/programs/health/$id`

Welfare:
- `/programs/welfare/my-applications`
- `/programs/welfare/$id`

Employment:
- `/programs/employment/my-applications`
- `/programs/employment/$id`

## What changed

- Added `src/lib/program-tracking-i18n.ts`
- Added English / Urdu / Sindhi copy for list page headings and actions
- Added English / Urdu / Sindhi copy for detail page headings and common labels
- Added localized labels for common fields:
  - Member ID / Membership No
  - Submitted / Updated
  - Approved Amount
  - Admin Remarks
  - Documents / Document
  - View Details / Back / Open / Note
- Preserved all existing Supabase fetch, document signed URL and application detail logic.
- Kept layout stable LTR while allowing localized text labels.

## Notes

This is a tracking-page localization layer. Some dynamic values from database/helper functions, such as detailed program statuses and option values, may still come from existing English helper functions. Those can be localized in the next polishing phase.

## Recommended next phase

Multilingual Admin/Public Polish Phase 8:

- Program status helper labels
- Document verification status helper labels
- Admin program review pages
- Public CMS pages
- Committee/designation pages
