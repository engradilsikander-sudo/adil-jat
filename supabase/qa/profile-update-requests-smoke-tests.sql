-- JAS Phase 7: Member Profile Update Requests smoke tests
-- Run manually in Supabase SQL Editor after applying
-- 20260710213000_profile_update_requests.sql.
-- All checks are read-only.

-- 1) Schema objects expected by the app.
select
  to_regclass('public.profile_update_requests') as request_table,
  to_regprocedure('public.submit_profile_update_request(jsonb,text,uuid)') as submit_rpc,
  to_regprocedure('public.cancel_profile_update_request(uuid)') as cancel_rpc,
  to_regprocedure('public.review_profile_update_request(uuid,text,text)') as review_rpc;

-- 2) Request status summary.
select
  status,
  count(*) as request_count,
  max(created_at) as latest_request_at
from public.profile_update_requests
group by status
order by status;

-- 3) The partial unique index should prevent this query from returning rows.
select
  member_id,
  count(*) as pending_request_count
from public.profile_update_requests
where status = 'pending'
group by member_id
having count(*) > 1;

-- 4) Invalid/empty request records. Expected: 0 rows.
select id, member_id, status, created_at
from public.profile_update_requests
where requested_changes = '{}'::jsonb
   or jsonb_typeof(requested_changes) <> 'object'
   or jsonb_typeof(current_snapshot) <> 'object'
   or nullif(trim(source_district), '') is null
   or nullif(trim(target_district), '') is null;

-- 5) Latest profile-update audit activity.
select
  id,
  actor_user_id,
  action,
  action_label,
  record_label,
  created_at
from public.audit_logs
where entity_table = 'profile_update_requests'
order by created_at desc
limit 50;

-- 6) Profile-update audit JSON must not contain raw CNIC/mobile values.
-- Expected: 0 rows. This scans for common Pakistan CNIC/mobile formats.
select id, action, created_at
from public.audit_logs
where entity_table = 'profile_update_requests'
  and concat_ws(
    ' ',
    coalesce(old_data::text, ''),
    coalesce(new_data::text, ''),
    coalesce(changed_data::text, '')
  ) ~ '(\\d{5}-\\d{7}-\\d)|(\\+92|0)3\\d{9}'
order by created_at desc;
