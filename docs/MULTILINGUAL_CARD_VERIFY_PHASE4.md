# Multilingual Card & Verification Phase 4

## Scope

This phase adds English / Urdu / Sindhi text support to member-facing card and verification pages without changing official card artwork or database behavior.

## Updated pages

- `/card`
- `/verify/$memberNo`

## What changed

- Digital card page labels, buttons, alerts and unavailable-state messages now follow the selected app language.
- Public verification page labels, statuses, warnings and guidance now follow the selected app language.
- Official generated membership card design remains stable and English-first for print/export consistency.
- Member IDs, verification URLs and identifiers remain LTR-safe.

## Test checklist

1. Switch language from the header.
2. Open `/card`.
3. Confirm header, summary, card controls and download buttons change language.
4. Open a public `/verify/<memberNo>` URL.
5. Confirm verification labels, status messages and guidance change language.
6. Test PNG download still works.
7. Test copy verification link and copy member number actions.

## Future phase

Recommended next phase: Admin panel multilingual foundation.
