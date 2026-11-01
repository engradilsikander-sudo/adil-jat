# Mobile UI Phase 1

This patch improves phone and tablet usability without changing Supabase, RLS, routes, or business logic.

## Improvements

- Header uses the mobile menu through tablet widths to avoid crowded navigation.
- Membership card previews auto-fit the available screen width instead of forcing horizontal scrolling.
- Admin member card previews use the same auto-fit behavior.
- Office bearer/designation cards auto-scale on mobile.
- Admin member list keeps card layout until large screens; the wide table is reserved for desktop.
- Registration step tabs scroll horizontally on small screens.
- Registration inputs/selects use mobile-safe 16px font sizing to prevent iOS zoom.
- Registration buttons stack properly on phones.
- Photo upload preview is more compact on mobile.
- Dashboard info chips handle long text better.
- Global CSS reduces horizontal overflow and improves tap targets.

## Validation

Run after applying:

```bash
npm run check
npm run build
npm run qa
```

Manual mobile checks:

- `/`
- `/register`
- `/dashboard`
- `/card`
- `/designation-card`
- `/admin`
- `/admin/members/<id>/card`
- `/admin/members/<id>/designation-card`
