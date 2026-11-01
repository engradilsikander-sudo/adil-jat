# Root/Header Cleanup Phase 2

This patch splits the heavy root layout/header code into dedicated layout components, config and auth hook.

## Goal

`src/routes/__root.tsx` should behave like an app shell only. It should not own the full navbar system, auth/admin role checks, dropdown rendering, service worker bootstrap and not-found page content.

## Updated

### `src/routes/__root.tsx`

Now focuses on:

- root document
- meta/head links
- global i18n provider
- app shell background
- public verify header hiding
- compact header detection
- outlet rendering

The file is reduced to around 120 lines.

## Added files

```txt
src/components/layout/Header.tsx
src/components/layout/AccountMenu.tsx
src/components/layout/ProgramsDropdown.tsx
src/components/layout/MoreDropdown.tsx
src/components/layout/NavLink.tsx
src/components/layout/PwaBootstrap.tsx
src/components/layout/NotFoundPage.tsx
src/hooks/useAuthRole.ts
src/config/navigation.tsx
```

## What moved out of `__root.tsx`

### Header UI

Moved to:

```txt
src/components/layout/Header.tsx
```

### Account/avatar menu

Moved to:

```txt
src/components/layout/AccountMenu.tsx
```

### Programs dropdown

Moved to:

```txt
src/components/layout/ProgramsDropdown.tsx
```

### More dropdown

Moved to:

```txt
src/components/layout/MoreDropdown.tsx
```

### Main nav link

Moved to:

```txt
src/components/layout/NavLink.tsx
```

### PWA service worker bootstrap

Moved to:

```txt
src/components/layout/PwaBootstrap.tsx
```

### Not found page content

Moved to:

```txt
src/components/layout/NotFoundPage.tsx
```

### Auth/admin role logic

Moved to:

```txt
src/hooks/useAuthRole.ts
```

### Navigation config

Moved to:

```txt
src/config/navigation.tsx
```

## Behavior preserved from Phase 1

- Hamburger/X remains removed.
- Mobile header remains `Logo | Language | Avatar`.
- Avatar menu remains the mobile account/navigation trigger.
- More dropdown remains organization-only.
- Public verify pages still hide the header.
- Card preview pages still use compact header.

## Notes

This patch does not change routes, database, election modules, landing page content or Supabase schema.

## Test checklist

```txt
1. npm run check
2. npm run build
3. Desktop header opens Programs dropdown
4. Desktop header opens More dropdown
5. Desktop avatar menu opens/closes
6. Mobile header has no hamburger/X
7. Mobile avatar menu opens Login/Register when logged out
8. Logged-in avatar menu shows dashboard/card/update/donor/register links
9. Admin avatar menu shows admin shortcuts
10. Not-found page still renders correctly
11. /verify/* pages still hide header
```
