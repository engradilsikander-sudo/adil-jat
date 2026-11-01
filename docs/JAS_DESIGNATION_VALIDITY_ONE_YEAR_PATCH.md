# JAS Designation Validity One-Year Patch

## Purpose

This patch makes every assigned designation valid for one year from the designation assignment date.

The app uses the existing committee assignment fields:

- `organization_committee_members.tenure_start` = designation assignment date / valid from
- `organization_committee_members.tenure_end` = designation expiry date / valid until

## What changed

- Admin assignment form now defaults the assign date to today.
- Expiry date is auto-generated as one year from the assignment date.
- Database trigger also enforces this default, so direct SQL/API inserts get expiry dates too.
- Existing active designation rows with missing expiry dates are backfilled.
- Public designation holders directory shows only currently valid holders.
- Designation holders directory shows validity and expiry date.
- Member card shows designation validity/expiry when a member has an active designation.
- Public member QR verification page shows designation validity and expiry date.
- Office bearer card shows validity and expiry date.
- Office bearer QR verification only verifies active, non-expired designation assignments.

## Apply commands

```bash
cd ~/projects/jas-app
unzip -o /mnt/c/Users/*/Downloads/jas-designation-validity-one-year-patch.zip -d .
npx supabase db push
npm run check
npm run build
npm run dev
```

## Admin workflow

1. Go to `Admin Panel > Committees`.
2. Open a committee.
3. Assign a member designation.
4. The assignment date defaults to today.
5. The expiry date auto-generates one year later.
6. Save the assignment.
7. The holder appears on `/designation-holders` while the designation is valid.

## Public verification behavior

- `/designation-holders` displays validity and expiry date.
- `/verify/<memberNo>` displays designation validity and expiry if the verified member currently holds a valid designation.
- `/verify/office-bearer/<officeBearerId>` only confirms the card while the designation is active and not expired.
