# Multilingual Admin Member Detail Phase 12 Unused Variable Fix

This patch fixes one TypeScript no-unused-locals error.

## Error

`iconBeforeClass` was declared in `AdminMemberApplicationPage` but was not used there.

## Fix

Changed:

```tsx
const { copy, textDir, textAlignClass, iconBeforeClass } = useAdminMemberDetailCopy()
```

to:

```tsx
const { copy, textDir, textAlignClass } = useAdminMemberDetailCopy()
```

`BackToAdmin` still uses its own local `iconBeforeClass`, so RTL icon spacing remains preserved.
