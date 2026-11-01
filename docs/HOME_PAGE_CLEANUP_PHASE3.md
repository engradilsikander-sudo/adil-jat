# Home Page Cleanup Phase 3

This patch cleans the landing page and keeps it focused on the JAS membership portal.

## Updated file

- `src/routes/index.tsx`

## What changed

### Removed/reduced

- Removed `TrustStrip`
- Removed `PublicInformationHub`
- Removed repeated program-heavy `PortalFeatures`
- Removed repeated hero buttons for Employment and Donor Leaderboard
- Removed public website style content from the main landing flow

### Simplified hero

Hero buttons now stay focused:

- Apply for Membership
- View Programs
- Donate

### Cleaned program cards

Program cards now show more accurate rollout badges:

- Membership Portal — Active
- Education Support — Active
- Health Assistance — Active
- Welfare Cases — Phase 2
- Employment Program — Phase 2
- Donation Verification — Manual

### Portal features now show system features only

- QR Verification
- Admin Approval
- Member Dashboard

## Not changed yet

This phase intentionally does not add home-page Urdu/Sindhi i18n. That should be the next phase so text migration stays controlled.

## Recommended test

```bash
npm run check
npm run build
```

Then check:

- `/`
- mobile width
- hero buttons
- `#programs-gateway` anchor
- program card links
- no horizontal scroll
