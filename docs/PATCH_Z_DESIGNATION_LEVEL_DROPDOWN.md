# Patch Z — Designation assignment Level dropdown

## Change

The quick designation assignment form now uses **Level** instead of **Committee**.

## Dropdown options

The Level dropdown shows these fixed options:

1. Central Executive Committee
2. Provincial
3. Divisional
4. District
5. Taluka

## How it works

The database still saves the assignment using the existing `organization_committee_members.committee_id` relationship. This patch changes the admin form to select the appropriate active committee behind the selected level.

- Central Executive Committee maps to an active central committee whose name contains `Central Executive`, `Central Working`, `CWC`, `CEC`, or `Markaz`.
- Provincial maps to an active central committee whose name contains `Provincial`, `Province`, or `Sindh`.
- Divisional maps to an active divisional committee.
- District maps to the best matching active district committee.
- Taluka maps to the best matching active taluka committee.

If a level has no matching active committee, it appears as `— not configured` and remains disabled.

## Files

- `src/routes/admin/members/$id.tsx`

## No database migration

This patch does not change the database schema.
