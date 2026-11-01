# Divisional Committee & Designation Support Phase 1

## Goal

Add the Divisional level between Central/Markaz and District in the JAS committee/designation system.

Updated hierarchy:

1. Central / Markaz
2. Divisional
3. District
4. Taluka

## What changed

- Added `divisional` committee type.
- Added `divisional` designation scope.
- Added `division` column to `organization_committees`.
- Added default divisional designations:
  - Divisional President
  - Divisional Vice President
  - Divisional General Secretary
  - Divisional Finance Secretary
  - Divisional Information Secretary
  - Divisional Coordinator
- Admin committee create/edit forms now show:
  - Division field for Divisional committees
  - District field for District committees
  - District + Taluka fields for Taluka committees
- Public committees page now shows Divisional committees, filters, and stats.
- Public committee detail and office bearer card location helpers support Divisional committee location display.

## Notes

This phase does not add elections or voting logic. It only adds Divisional support to the existing committee/designation system.

For divisional committee office-bearer assignment, the member search currently remains broad because member records do not have a dedicated `division` column. Admin can still select approved members and verify their district manually.
