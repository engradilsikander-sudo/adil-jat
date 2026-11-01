# Patch T — Designation on Membership Card

## User decision

Office bearer designations will no longer create a separate office bearer card for members.

New process:

1. Only `admin` or `super_admin` can assign designations.
2. Designation assignment still uses the official committee assignment table.
3. After assignment, the designation appears on the standard JAS membership card.
4. The membership QR verification page also shows the active designation.
5. Old office bearer card routes redirect to the standard membership card.

## Included changes

- Removed Office Bearer Card links from member account/navigation/dashboard quick actions.
- Added active designation lookup helper for membership card pages.
- Updated user membership card page to attach active designation.
- Updated admin membership card page to attach active designation.
- Updated MembershipCard front and back design to show designation when assigned.
- Updated membership QR verification server action to include active designation.
- Updated public verification page to show designation and designation area.
- Restricted quick designation assignment UI to organization managers (`admin` / `super_admin`).
- Updated admin member detail text from separate card language to membership-card designation language.
- Redirected `/designation-card` to `/card`.
- Redirected `/admin/members/$id/designation-card` to `/admin/members/$id/card`.

## No database migration

This patch does not add a new table. It reuses:

- `organization_committees`
- `organization_designations`
- `organization_committee_members`

The existing RLS helper `current_user_can_manage_organization()` already allows only `admin` and `super_admin` to manage organization/committee designations.

## Expected behavior

- Admin/Super Admin assigns a designation to an approved member.
- Member opens `/card`.
- Standard membership card shows `JAS Designation` with level/location.
- QR verification `/verify/:memberNo` shows the designation.
- `/designation-card` no longer shows a separate card.
