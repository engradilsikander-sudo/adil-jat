# JAS Designation Validity Strict One-Year Fix

This fix makes designation holder validity exactly one year from assignment date, inclusive.

Example:

- Assign date: `2026-06-01`
- Expiry date: `2027-05-31`

## Why this was needed

Some existing records were showing `2028` because older `tenure_end` values were preserved from committee tenure or manual assignment values. This patch forces designation assignment expiry to be calculated from assignment date only.

## Files changed

- `src/lib/designation-validity.ts`
- `src/lib/committees.ts`
- `supabase/migrations/20260618143000_fix_designation_validity_strict_one_year.sql`

## Apply

```bash
unzip -o /mnt/c/Users/*/Downloads/jas-designation-validity-strict-one-year-fix.zip -d .
npx supabase db push
npm run check
npm run build
```
