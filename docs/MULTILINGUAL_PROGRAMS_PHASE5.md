# Multilingual Programs Phase 5

This phase localizes the public program landing pages for English, Urdu and Sindhi.

## Scope

Updated public program pages:

- `/programs/education`
- `/programs/health`
- `/programs/welfare`
- `/programs/employment`

## What changed

- Added reusable helper: `src/lib/program-page-i18n.ts`
- Added page-level English / Urdu / Sindhi copy dictionaries
- Program landing page hero text now follows the selected language
- Program feature cards now follow the selected language
- Required document labels now follow the selected language
- CTA buttons now follow the selected language
- Urdu/Sindhi text blocks use RTL text direction
- Layout remains stable LTR to avoid card/grid mirroring issues

## Not included

This phase does not translate program application forms, my-applications pages, detail pages or admin program pages. Those should be handled in later phases because they contain more validation/status/action flows.

## Recommended next phase

Multilingual Programs Forms Phase 6:

- Education application flow
- Health application flow
- Welfare application flow
- Employment application flow
- My applications lists
- Application detail/status pages
