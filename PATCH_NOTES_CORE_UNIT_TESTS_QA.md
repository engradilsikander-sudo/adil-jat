# Patch — Core Unit Tests + QA Coverage

This patch expands Phase 6 from minimal CSV tests into a broad core regression suite.

## Production safety improvements

- Centralized reusable authentication validation helpers.
- Password-strength logic is shared by the reset-password page and tests.
- Email and Pakistan phone normalization are shared by signup and tests.
- Notification action links now allow only same-origin HTTP(S) routes and block
  `javascript:`, `data:`, protocol-relative, external-origin, control-character,
  and backslash-based URLs.
- Admin member action input validators were extracted from the server action
  module into a pure, directly testable module.
- Admin date validation now rejects impossible calendar dates such as
  `2026-02-30`.

## Test coverage areas

- Authentication email, phone, and password strength
- Registration form validation and member-to-form mapping
- CNIC/mobile formatting, masking, and normalization
- Membership card configuration and verification URLs
- Designation validity and expiry calculation
- District/taluka area permissions and row filtering
- Finance labels, amounts, documents, and receipt text
- Membership payment helpers
- Notification labels, routes, statuses, and safe action URLs
- Admin approve/reject/edit/payment/receipt input validation
- Existing full-card CSV export and audit hardening tests

## QA commands

```bash
npm run test:core
npm run check
npm test
npm run build
npm run qa:core
```
