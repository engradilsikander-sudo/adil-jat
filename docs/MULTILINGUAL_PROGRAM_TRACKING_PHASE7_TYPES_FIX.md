# Multilingual Program Tracking Phase 7 Type Fix

This patch fixes TypeScript scope errors introduced in Phase 7.

## Fixed errors

- `copy` used inside child components without being in scope
- `arrowClass` used inside child components without being in scope
- `arrowClass` declared but not used in health tracking page

## Updated files

- `src/routes/programs/education/$id.tsx`
- `src/routes/programs/education/my-applications.tsx`
- `src/routes/programs/health/$id.tsx`
- `src/routes/programs/health/my-applications.tsx`

## Fix approach

Localized labels are now passed into child components as props where needed.
