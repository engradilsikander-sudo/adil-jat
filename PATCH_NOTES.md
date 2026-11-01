# JAS Office Bearer Quick Issue Patch

Adds a quick office bearer designation issue workflow directly on `/admin/members/$id` for approved members.

Changed file:
- `src/routes/admin/members/$id.tsx`

No migrations added. No card, verification, AdminShell, sidebar, header, payment panel, election, program, finance, or CMS files changed.

Validation performed in sandbox:
- `npm run typecheck` passed
- `npm run build` passed
