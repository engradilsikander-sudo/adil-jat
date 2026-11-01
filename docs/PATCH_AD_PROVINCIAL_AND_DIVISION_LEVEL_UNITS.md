# Patch AD — Provincial and Division Level Units

## Changes

1. Adds `Provincial` as an Organization Level / Level Unit type.
2. Updates the Create Level Unit form:
   - Central Executive Committee: no area field required.
   - Provincial: no district/taluka field required.
   - Divisional: shows `Division` field instead of `District`.
   - District: shows `District` field.
   - Taluka: shows `District` and `Taluka` fields.
3. Updates Level Unit cards to show the correct area field:
   - Central: Sindh / Central
   - Provincial: Sindh / Provincial
   - Divisional: Division
   - District: District
   - Taluka: District + Taluka
4. Updates organization level summary cards to include Provincial.
5. Updates designation assignment lookup so `Provincial` can find real provincial level units.
6. Adds a Supabase migration for the new `provincial` level.

## Migration

Run this on local/cloud Supabase:

```bash
npx supabase db push
```

Or run the SQL file in Supabase SQL Editor:

```text
supabase/migrations/20260613100000_provincial_level_units.sql
```

## No route changes

Routes stay the same:

- `/admin/committees`
- `/admin/committees/:id`

Only UI wording and level behavior changed.
