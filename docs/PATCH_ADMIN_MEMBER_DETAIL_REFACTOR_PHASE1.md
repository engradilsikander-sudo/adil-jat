# Patch — Admin Member Detail Refactor Phase 1

Branding policy: this patch keeps the visible brand as **JAS — Jatt Alliance Sindh**. No JASW rename is included.

## Purpose

The admin member detail route had grown into a very large file, making future patches risky and harder to review. This patch splits the route into focused panels and helper modules while keeping the existing UI and workflow behavior intact.

## What changed

- `src/routes/admin/members/$id.tsx` is now the page/container layer.
- Profile, edit, payment, review, and office-bearer UI moved into focused components.
- Shared member-detail types, constants, formatting helpers, fetch helpers, and validation helpers moved into one lib helper module.
- Admin member detail route line count reduced from roughly 3,500+ lines to roughly 1,250 lines.
- Non-route components are placed under `src/components/admin/member-detail/` so TanStack Router does not treat them as route files.

## Files changed

```txt
src/routes/admin/members/$id.tsx
src/components/admin/member-detail/AdminMemberProfilePanel.tsx
src/components/admin/member-detail/AdminMemberPaymentPanel.tsx
src/components/admin/member-detail/AdminMemberReviewPanel.tsx
src/components/admin/member-detail/AdminMemberEditForm.tsx
src/components/admin/member-detail/OfficeBearerIssuePanel.tsx
src/lib/admin-member-detail.helpers.ts
docs/PATCH_ADMIN_MEMBER_DETAIL_REFACTOR_PHASE1.md
```

## Validation

Run:

```bash
npm run check
npm run build
```

Manual checks:

1. Open admin member detail page.
2. Confirm member summary/header loads.
3. Test edit application form open/cancel/save.
4. Test receipt upload/replace flow.
5. Test payment status buttons.
6. Test approve/reject panel for pending member.
7. Test Assign Designation panel for approved member.
8. Test View Card links still open.

## Notes

This patch intentionally does not refactor:

- `src/routes/register.tsx`
- `src/lib/i18n.tsx`
- `src/styles.css`

Those should be handled in later focused patches so the diff remains safe and reviewable.
