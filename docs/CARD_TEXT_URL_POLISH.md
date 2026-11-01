# Card Text/URL Polish Patch

## Scope

This patch updates only card text and verification URL handling.

## Changed

- Uses production verification URL origin:
  - `https://jasofficial.org/verify/<memberNo>`
- Changes back-side badge text:
  - `Back Side` → `Card Details`
- Changes front-side label:
  - `Profession / Caste` → `Profession`
- Displays verification URL in a cleaner short form:
  - `jasofficial.org/verify/<memberNo>`
- Keeps QR target as the full production URL.
- Adds minor QR panel spacing polish.

## Not changed

- CNIC visibility unchanged.
- Mobile visibility unchanged.
- Address visibility unchanged.
- Emergency contact visibility unchanged.
- Card dimensions unchanged.
- Exported card structure is not heavily changed.
- No database changes.
- No election files.
