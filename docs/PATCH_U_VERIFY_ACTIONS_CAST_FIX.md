# Patch U — Verify actions TypeScript cast fix

## Fix

`src/lib/verify/actions.ts` was failing TypeScript check because Supabase generated types returned `GenericStringError[]` for the nested committee relationship select.

The intended selected shape is correct at runtime, but TypeScript needs a safe intermediate `unknown` cast:

```ts
const rows = (data ?? []) as unknown as Array<...>
```

## Files

- `src/lib/verify/actions.ts`

## No database migration
