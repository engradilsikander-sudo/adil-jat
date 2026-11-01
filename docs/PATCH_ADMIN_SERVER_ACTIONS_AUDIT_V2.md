# Patch 3 — Admin Server Actions + Audit Log Coverage v2

Branding note: this patch keeps the official visible brand as **JAS — Jatt Alliance Sindh**.

## What changed

### 1. Membership admin writes moved behind server actions

The member detail page now routes sensitive membership-admin updates through TanStack server functions backed by the Supabase service role key on the server:

- admin member application edit
- admin membership receipt create/update
- admin membership payment status update

The browser still uploads files to the configured Supabase Storage bucket, but database writes are now performed by server actions after validating the current admin session and membership admin role.

### 2. Explicit admin audit logs added

Server actions create explicit `audit_logs` rows with:

- actor user ID/email
- module key
- entity table and ID
- action label
- redacted old/new/changed data

Sensitive fields such as CNIC/mobile are masked in explicit action audit payloads.

### 3. Membership payment records added to central audit coverage

A new migration adds `membership_payments` to the central database audit trigger coverage and improves audit labels for membership payment records.

### 4. Admin dashboard recent activity

Super admins now see a compact **Recent admin activity** panel on the main admin dashboard, with a link to the full audit log page.

## Changed files

```txt
src/lib/admin/actions.ts
src/routes/admin/members/$id.tsx
src/routes/admin.tsx
src/lib/audit-logs.ts
supabase/migrations/20260707093000_admin_server_actions_audit_coverage.sql
docs/PATCH_ADMIN_SERVER_ACTIONS_AUDIT_V2.md
```

## Apply

```bash
cd ~/projects/jas-app
unzip -o /mnt/c/Users/*/Downloads/jas-admin-server-actions-audit-v2-patch.zip -d .
```

## Supabase migration

Cloud Supabase me migration push/apply karna zaroori hai:

```bash
npx supabase db push
```

Agar linked project check karna ho:

```bash
npx supabase projects list
npx supabase status
```

## Validate

```bash
npm run check
npm run build
```

## Manual QA

1. Login as super admin or membership admin.
2. Open `/admin/members/<member-id>`.
3. Edit application details and save.
4. Replace/upload membership payment receipt for a pending/rejected member.
5. Mark payment status as Paid/Failed/Waived.
6. Open `/admin/audit-logs` as super admin and confirm entries appear.
7. Open `/admin` as super admin and confirm Recent admin activity appears.
8. Confirm normal member dashboard still works.

## Notes

- This patch does not rename JAS branding.
- This patch does not change member number format such as `JAS-2026-0001`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in server/Vercel environment variables, never in client `VITE_` variables.
