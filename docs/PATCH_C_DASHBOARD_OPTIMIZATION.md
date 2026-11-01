# Patch C — Dashboard loading optimization

## Purpose
Improve `/dashboard` perceived speed by loading the most important data first and delaying heavier activity data until after the member header/payment state is visible.

## Changes

1. Dashboard now loads the authenticated user, member profile, membership payment status, and member photo first.
2. The main dashboard renders after the primary data is ready instead of waiting for all activity widgets.
3. Program applications, donations, and notifications load as secondary data after initial render.
4. `program_applications` query is capped to the latest 20 records.
5. `finance_donations` query is capped to the latest 20 records.
6. The dashboard no longer calls `get_donor_leaderboard` with `_limit: 100` just to find the current member's rank.
7. Donor rank is temporarily displayed as `-` until a dedicated lightweight RPC such as `get_my_donor_rank(member_id)` is added in a future database patch.
8. No database migration included.

## Notes

Because this patch intentionally removes the full leaderboard RPC call from the dashboard, donor rank is not computed on dashboard load. This avoids a heavy query on every member dashboard visit.

A future DB patch can add a small RPC dedicated to the current member's rank, then the dashboard can call only that RPC instead of fetching the full leaderboard.

## Test checklist

1. Open `/dashboard` as a member with an existing application.
2. Header/member card should appear faster.
3. Membership payment status should appear with the initial dashboard load.
4. Program summary should load shortly after the main dashboard appears.
5. Donation panel should load shortly after the main dashboard appears.
6. Notifications preview should load shortly after the main dashboard appears.
7. Browser network tab should no longer show `rpc/get_donor_leaderboard` from `/dashboard`.
8. `program_applications` query should use `limit=20`.
9. `finance_donations` query should use `limit=20`.
10. `/register`, `/card`, and admin pages should be unaffected.
