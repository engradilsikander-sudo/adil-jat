# Multilingual Programs Phase 5 Type Fix

This patch fixes TypeScript inference for `textDir` in the multilingual program page helper.

## Issue

TypeScript inferred `textDir` as `string`, while child components expected the stricter union type:

```ts
'ltr' | 'rtl'
```

## Fix

`src/lib/program-page-i18n.ts` now explicitly types `textDir` as:

```ts
type TextDirection = 'ltr' | 'rtl'
```

This resolves errors in:

- `src/routes/programs/education.tsx`
- `src/routes/programs/health.tsx`
- `src/routes/programs/welfare.tsx`
- `src/routes/programs/employment.tsx`
