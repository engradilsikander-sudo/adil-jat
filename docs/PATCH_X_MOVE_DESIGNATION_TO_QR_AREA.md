# Patch X — Move designation to QR area on membership card

## Change

The active JAS designation is moved to the right-side QR area on the front membership card.

## Details

- Removes designation from the main member detail grid.
- Main detail grid now shows Profession again.
- Shows `JAS Designation` badge above the QR code when the member has an active assigned designation.
- Keeps the same standard membership card. No separate office bearer card is restored.
- No database migration.

## File

- `src/components/MembershipCard.tsx`
