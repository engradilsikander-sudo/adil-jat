# Admin Avatar Dropdown Types Fix

Fixes TypeScript unused-variable errors after the admin avatar dropdown scroll cleanup.

## Fixed errors

- Removed unused `getAdminAccountItems` import from `Header.tsx`.
- Removed unused `onClose` destructuring from `AccountMenuPanel`.
- Kept `onClose` in the prop type so existing component calls remain compatible.

## No UI changes

This is only a TypeScript/build fix.
