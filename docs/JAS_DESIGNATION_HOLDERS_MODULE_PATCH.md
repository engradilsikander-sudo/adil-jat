# JAS Designation Holders Module Patch

This patch adds a public `Designation Holders` module to the JAS app.

## What was added

- New navbar option: `Designation Holders`.
- New public route: `/designation-holders`.
- Public directory cards showing:
  - member name
  - member photo or initials fallback
  - designation level
  - designation title
  - committee / area / jurisdiction
  - member ID
  - tenure
- Correct official hierarchy order:
  1. CEC
  2. Provincial
  3. Divisional
  4. District
  5. Taluka
- Search and level filter.
- Public database RPC: `public.get_public_designation_holders()`.
- Safe storage policy for showing photos only for approved members who are active designation holders in active public committees.

## Admin workflow

1. Go to `Admin Panel > Committees`.
2. Create or open a committee.
3. Make sure the committee is:
   - `status = active`
   - `public_display = true`
4. Add an approved member as a committee member.
5. Assign designation title and sort order.
6. The member appears on `/designation-holders`.

## Database migration

Apply the new migration:

```bash
npx supabase db push
```

For local reset/dev rebuild:

```bash
npx supabase db reset
```

## Verification

```bash
npm run check
npm run build
```

Both commands passed while preparing this patch.
