-- JAS Office Bearer Verification Smoke Tests
-- Run manually in Supabase SQL Editor. These are read-only checks.

-- 1) Active committee assignments with member/designation
select
  m.full_name,
  m.member_no,
  od.title as designation,
  oc.name as committee_name,
  oc.level,
  oc.district,
  oc.taluka,
  ocm.status as assignment_status,
  ocm.tenure_start,
  ocm.tenure_end
from public.organization_committee_members ocm
join public.members m on m.id = ocm.member_id
left join public.organization_designations od on od.id = ocm.designation_id
join public.organization_committees oc on oc.id = ocm.committee_id
where ocm.status = 'active'
order by oc.level, oc.district, oc.taluka, od.sort_order nulls last, m.full_name;

-- 2) Assignments that may not verify as active
select
  m.full_name,
  m.member_no,
  od.title as designation,
  oc.name as committee_name,
  oc.status as committee_status,
  ocm.status as assignment_status,
  m.status as member_status,
  m.member_no as member_no_check
from public.organization_committee_members ocm
join public.members m on m.id = ocm.member_id
left join public.organization_designations od on od.id = ocm.designation_id
join public.organization_committees oc on oc.id = ocm.committee_id
where oc.status <> 'active'
   or ocm.status <> 'active'
   or m.status <> 'approved'
   or m.member_no is null;
