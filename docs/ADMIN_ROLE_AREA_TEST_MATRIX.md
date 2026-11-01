# JAS Admin Role + Area Test Matrix

## Role source of truth

- `user_roles` = high-level role identity.
- `admin_area_permissions` = module + district/taluka/all-Sindh scope.
- `program_admin_assignments` = legacy fallback only.

## Expected access

| Role | Needs area permission? | Expected access |
|---|---:|---|
| `super_admin` | No | Full system including roles, area permissions, audit logs |
| `admin` | No | Full operational admin except sensitive super-admin-only areas if restricted |
| `membership_admin` | Yes for area-limited membership | Membership review according to assigned area |
| `education_admin` | Yes | Education applications according to assigned area |
| `health_admin` | Yes | Health cases according to assigned area |
| `welfare_admin` | Yes | Welfare cases according to assigned area |
| `employment_admin` | Yes | Employment profiles according to assigned area |
| `finance_admin` | Yes | Finance records according to assigned area |
| Normal member | N/A | Own dashboard, own cards, own applications |

## Manual test accounts

Recommended test cases:

1. `adminsuper@jas.com`
   - Role: `super_admin`
   - Should open `/admin`, `/admin/roles`, `/admin/area-permissions`, `/admin/audit-logs`.

2. `admineducation@jas.com`
   - Role: `education_admin`
   - No area permission: should see no education data.
   - Education + District Umerkot: should see only Umerkot education data.
   - Education + All Sindh: should see all education data.

3. `adminhealth@jas.com`
   - Role: `health_admin`
   - Health + All Sindh: should see health data.
   - Should not open education admin data unless assigned.

4. `adminmembership@jas.com`
   - Role: `membership_admin`
   - Should approve/reject membership if membership area access exists or if policy grants all membership review.

5. Normal member
   - Should not open `/admin`.
   - Should not open `/admin/audit-logs`.

## Area permission examples

All Sindh Education:

```text
Module: Education
Scope: All Sindh
Can view: true
Can review: true
Can approve: true
```

District Education:

```text
Module: Education
Scope: District
District: Umerkot
Can view: true
Can review: true
Can approve: false
```

Taluka Education:

```text
Module: Education
Scope: Taluka
District: Umerkot
Taluka: Kunri
Can view: true
Can review: true
Can approve: false
```
