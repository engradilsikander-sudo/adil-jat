-- JAS Role + Area Permission Smoke Tests
-- Run manually in Supabase SQL Editor. These are read-only checks.

-- 1) Show current role assignments
select
  u.email,
  ur.user_id,
  ur.role,
  ur.created_at
from public.user_roles ur
left join auth.users u on u.id = ur.user_id
order by u.email, ur.role;

-- 2) Show area permissions
select
  u.email,
  aap.module_key,
  aap.scope,
  aap.district,
  aap.taluka,
  aap.can_view,
  aap.can_review,
  aap.can_approve,
  aap.is_active,
  aap.created_at
from public.admin_area_permissions aap
left join auth.users u on u.id = aap.user_id
order by u.email, aap.module_key, aap.scope;

-- 3) Module admins without matching area permissions
with module_roles as (
  select
    ur.user_id,
    ur.role,
    case ur.role
      when 'membership_admin' then 'membership'
      when 'education_admin' then 'education'
      when 'health_admin' then 'health'
      when 'welfare_admin' then 'welfare'
      when 'employment_admin' then 'employment'
      when 'finance_admin' then 'finance'
      else null
    end as expected_module
  from public.user_roles ur
  where ur.role in (
    'membership_admin',
    'education_admin',
    'health_admin',
    'welfare_admin',
    'employment_admin',
    'finance_admin'
  )
)
select
  u.email,
  mr.role,
  mr.expected_module,
  count(aap.id) as active_area_permission_count
from module_roles mr
left join auth.users u on u.id = mr.user_id
left join public.admin_area_permissions aap
  on aap.user_id = mr.user_id
 and aap.module_key = mr.expected_module
 and aap.is_active = true
group by u.email, mr.role, mr.expected_module
having count(aap.id) = 0
order by u.email;

-- 4) Invalid area permission rows
select *
from public.admin_area_permissions
where (scope = 'all' and (district is not null or taluka is not null))
   or (scope = 'district' and (district is null or taluka is not null))
   or (scope = 'taluka' and (district is null or taluka is null))
order by created_at desc;
