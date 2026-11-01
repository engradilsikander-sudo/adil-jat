# Central Advisory Committee Level Patch v2

This patch adds `Central Advisory Committee` as a first-class organization level in the JAS app.

## What changed

- Adds `central_advisory` to committee type options.
- Shows `Central Advisory Committee` in Admin > Organization Levels dropdown.
- Adds `central_advisory` designation scope.
- Adds public display/order support for committees and designation holders.
- Adds database constraint support for `central_advisory`.
- Seeds advisory designations.
- Keeps verify page `activeDesignation` type compatible by returning `validFrom`, `expiresOn`, `validity`, and `expiryDate`.

## Expected order

CEC → Central Advisory → Provincial → Divisional → District → Taluka

## Quick verification after applying

```bash
grep -RIn "central_advisory\|Central Advisory Committee" \
  src/lib/committees.ts \
  src/routes/admin/committees.tsx \
  src/routes/admin/committees/\$id.tsx \
  src/lib/verify/actions.ts
```

If the dropdown still does not show it after applying, restart the dev server and clear Vite/TanStack caches:

```bash
rm -rf .vinxi .vite node_modules/.vite
npm run dev
```

For production, commit the files and redeploy. The dropdown is frontend code, so `npx supabase db push` alone will not update the deployed UI.
