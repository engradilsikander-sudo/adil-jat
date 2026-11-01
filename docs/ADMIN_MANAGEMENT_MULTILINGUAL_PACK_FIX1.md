# Admin Management Multilingual Pack — Fix 1

This patch fixes TypeScript errors in `src/routes/admin/committees.tsx` after Patch B.

## Fixed errors

### 1. Missing `division` in `createCommittee()` payload

The latest committee schema requires:

```ts
division: string | null
```

Patch adds:

```ts
division: null
```

to the create committee payload.

### 2. Missing `divisional` stats key

`CommitteeType` now includes:

```ts
'divisional'
```

Patch adds:

```ts
divisional: 0
```

to the stats accumulator and adds a Divisional stat card.

## Files updated

- `src/routes/admin/committees.tsx`
