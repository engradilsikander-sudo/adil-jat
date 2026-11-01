# Membership Fee Phase 1

This patch adds the dedicated membership application fee foundation without connecting a payment gateway yet.

## Policy

- Base membership application fee: **Rs. 600**
- Additional charges label: **applicable tax/processing charges**
- Tax/gateway charges are not hardcoded yet.
- Membership fee is separate from voluntary donations and finance donation records.

## Database

New table:

- `public.membership_payments`

One payment row is stored per member application using a unique `member_id` index.

Statuses:

- `pending`
- `paid`
- `failed`
- `cancelled`
- `refunded`
- `waived`

Methods:

- `manual`
- `jazzcash`
- `easypaisa`
- `bank`
- `gateway`

## Current Phase 1 behavior

- Public home/signup/register pages show the fee notice.
- When a membership form is submitted, a pending payment row is created if one does not already exist.
- Existing payment records are not overwritten during form resubmission.
- Dashboard shows membership fee status.
- Admin member detail shows fee status and allows membership admins to manually mark paid, waived, or pending.
- Approval is not blocked by fee status yet.

## Future Phase 2

Payment gateway phase can add:

- AssanPay/JazzCash/EasyPaisa routing
- gateway references
- webhook verification
- payment receipts
- approval rule requiring `paid` or `waived` before approval
