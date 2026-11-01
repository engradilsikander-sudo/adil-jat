-- JAS Audit Logs Smoke Tests
-- Run manually in Supabase SQL Editor. These are read-only checks.

-- 1) Latest audit logs
select
  id,
  actor_user_id,
  action,
  table_schema,
  table_name,
  record_id,
  created_at
from public.audit_logs
order by created_at desc
limit 50;

-- 2) Audit coverage by table
select
  table_name,
  action,
  count(*) as log_count,
  max(created_at) as latest_log_at
from public.audit_logs
group by table_name, action
order by latest_log_at desc nulls last;

-- 3) Sensitive fields quick scan in JSON text output
-- Expected: should return 0 rows if redaction is working for common fields.
select id, table_name, action, created_at
from public.audit_logs
where old_data::text ~* 'cnic|mobile|phone|password|token|secret'
   or new_data::text ~* 'cnic|mobile|phone|password|token|secret'
order by created_at desc
limit 20;
