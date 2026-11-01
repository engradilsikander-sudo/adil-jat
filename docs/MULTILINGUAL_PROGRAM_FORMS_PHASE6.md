# Multilingual Program Forms Phase 6

This phase localizes the user-facing program application forms for English, Urdu and Sindhi.

## Updated routes

- `/programs/education/apply`
- `/programs/health/apply`
- `/programs/welfare/apply`
- `/programs/employment/apply`

## What changed

- Added reusable program form localization helper:
  - `src/lib/program-apply-i18n.ts`
- Added English / Urdu / Sindhi copy for program application form headings.
- Added English / Urdu / Sindhi copy for primary form placeholders.
- Added English / Urdu / Sindhi copy for membership verification labels.
- Added English / Urdu / Sindhi copy for upload / required / optional / submit / back controls.
- Kept app layout stable LTR while text blocks use RTL-safe alignment where needed.
- Preserved existing Supabase submit/upload logic.

## Not changed

This phase does not change database schema or storage buckets.

This phase does not translate admin program review pages.

## Recommended next phase

Multilingual Program Tracking Phase 7:

- `/programs/*/my-applications`
- `/programs/*/$id`
- Status cards
- Document verification labels
- Application detail labels
