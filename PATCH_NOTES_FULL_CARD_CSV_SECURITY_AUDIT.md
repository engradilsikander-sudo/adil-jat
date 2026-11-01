# Patch — Full Card CSV Security + Audit Hardening

## Prerequisite

Apply this after `jas-full-card-csv-export-patch.zip`.

## What changed

- Full unmasked member-card CSV export now creates a mandatory audit record before download.
- Export is blocked if the audit RPC/migration is unavailable or logging fails.
- Audit metadata stores record count, active filters, area scope, roles, file name and card version.
- Audit metadata deliberately does not store member rows, CNIC/mobile values, or the search text.
- CSV cells starting with `=`, `+`, `-` or `@` are neutralized to prevent spreadsheet formula injection.
- Newline and quote handling is covered by unit tests.
- 1,000+ record pagination is isolated and unit tested.
- Member-card version, organization name and public verification origin now use shared configuration.
- Admin card, member card and CSV issue/version labels use the same version source.
- Audit Logs now includes a `Member Card CSV Exports` table filter.
- `npm run qa` now runs unit tests before the production build.

## Database migration

```txt
supabase/migrations/20260710193000_member_card_csv_export_audit.sql
```

The migration adds:

```txt
public.log_member_card_csv_export(...)
```

Only authenticated `admin`, `super_admin`, or `membership_admin` users can execute it.

## Apply

```bash
cd ~/projects/jas-app
unzip -o /mnt/c/Users/*/Downloads/jas-full-card-csv-security-audit-hardening-patch.zip -d .

# Local Supabase
npx supabase migration up --local

# Verify remote migration before applying
npx supabase db push --dry-run
npx supabase db push

npm run check
npm test
npm run build
```

## Production test checklist

1. Login as an authorized membership admin.
2. Apply a district/taluka/status/search filter and export the CSV.
3. Confirm all matching records are exported and CNIC/mobile values are unmasked.
4. Confirm values beginning with formula characters open as plain text in Excel/Google Sheets.
5. Login as super admin and open Admin → Audit Logs.
6. Filter table by `Member Card CSV Exports` and confirm record count/filter metadata is present.
7. Confirm the audit row does not contain full CNIC, mobile, emergency mobile, or search text.
8. Test a restricted-area membership admin and confirm only permitted member rows export.

## Important behavior

Until the migration is applied, the browser export will fail intentionally with an audit-log error. This prevents an unlogged sensitive-data download.
