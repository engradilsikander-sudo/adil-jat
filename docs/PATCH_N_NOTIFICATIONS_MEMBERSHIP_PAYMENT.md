# Patch N — Notifications pagination + membership/payment notifications

## Summary

This patch improves the in-app notifications system.

## Changes

1. `/notifications` now loads the latest 50 notifications first.
2. Adds a `Load More` button to fetch the next 50 notifications.
3. Notification messages preserve line breaks with `whitespace-pre-line`.
4. Adds a database trigger for membership approval/rejection notifications.
5. Adds a database trigger for membership payment status notifications for `paid`, `failed`, and `waived`.
6. Approved membership notification uses the requested Urdu congratulation message.

## Database migration

New migration:

```text
supabase/migrations/20260609123000_membership_payment_notifications_phase2.sql
```

This migration creates:

```text
public.notify_membership_status_change()
trg_notify_membership_status_change
public.notify_membership_payment_status_change()
trg_notify_membership_payment_status_change
```

## Notes

This is still an in-app notification system. It does not send browser push notifications. Users will see notifications when they open the app or visit `/notifications`.
