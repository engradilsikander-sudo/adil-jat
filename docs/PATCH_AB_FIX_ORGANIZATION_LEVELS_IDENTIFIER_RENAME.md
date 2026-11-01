# Patch AB — Fix Organization Levels identifier rename

## Fix

Patch AA renamed user-facing labels correctly, but it also accidentally renamed TypeScript identifiers in `src/routes/admin/committees.tsx`, producing invalid code such as:

```ts
currentUserCanManageOrganization Levels
fetchOrganization LevelsForAdmin
function AdminOrganization LevelsPage()
```

This patch restores internal TypeScript identifiers while keeping the new UI wording:

- Organization Levels
- Level Units
- Unit Name
- Manage Unit

## File

- `src/routes/admin/committees.tsx`

## No database migration
