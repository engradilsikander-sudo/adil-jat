# Patch W — Membership card unused designation fix

## Fix

Removed the unused `designationLevel` variable from `src/components/MembershipCard.tsx`.

This resolves:

```text
TS6133: 'designationLevel' is declared but its value is never read.
```

## Files

- `src/components/MembershipCard.tsx`

## No database migration
