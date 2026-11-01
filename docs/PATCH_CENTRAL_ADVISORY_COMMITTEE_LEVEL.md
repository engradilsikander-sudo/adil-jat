# Patch: Central Advisory Committee Level

Adds **Central Advisory Committee** as a separate organization level for the JAS designation holder module.

## What changed

- Added `Central Advisory Committee` to Admin > Organization Levels dropdown.
- Added a separate `central_advisory` database value for `organization_committees.committee_type`.
- Added a separate `central_advisory` designation scope.
- Seeded advisory titles:
  - Chief Patron
  - Patron
  - Senior Advisor
  - Advisor
  - Legal Advisor
  - Media Advisor
  - Policy Advisor
  - Advisory Board Member
- Updated member designation assignment quick form.
- Updated public Committees and Designation Holders pages.
- Updated QR/member verification designation labels.
- Updated public designation holders RPC ordering:
  `CEC → Advisory → Provincial → Divisional → District → Taluka`.

## Apply

```bash
unzip -o /mnt/c/Users/*/Downloads/jas-central-advisory-level-patch.zip -d .
npx supabase db push
npm run check
npm run build
```

## Test

1. Open `/admin/committees`.
2. Confirm Level dropdown shows **Central Advisory Committee**.
3. Create a Central Advisory Committee unit.
4. Open that unit and assign a member using advisory designations.
5. Confirm `/designation-holders`, `/committees`, and member card verification show Advisory correctly.
