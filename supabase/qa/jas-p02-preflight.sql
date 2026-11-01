-- Read-only ACL/schema preflight for JAS P0.2. Run against the intended project.
begin read only;
select c.relname as table_name,c.relrowsecurity as rls_enabled,
  has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select,
  has_table_privilege('authenticated',c.oid,'INSERT') as authenticated_insert,
  has_table_privilege('authenticated',c.oid,'UPDATE') as authenticated_update,
  has_table_privilege('anon',c.oid,'SELECT') as anonymous_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('program_applications','program_documents','program_admin_assignments',
  'organization_committees','organization_designations','organization_committee_members',
  'finance_donations','finance_expenses','finance_audit_logs','cms_pages','membership_payments')
order by c.relname;
select to_regclass('public.health_application_summaries') as health_summary_view,
  to_regprocedure('public.submit_membership_application_500(jsonb,jsonb)') as applicant_rpc,
  to_regprocedure('public.review_membership_payment_500(uuid,uuid,public.membership_payment_status,text,jsonb,uuid)') as reviewer_rpc;
select column_name,column_default,is_nullable from information_schema.columns
where table_schema='public' and ((table_name='members' and column_name='membership_fee_required')
  or (table_name='membership_payments' and column_name in ('base_amount','total_amount','tax_amount')));
select policyname,tablename,roles,cmd from pg_policies where schemaname='public'
  and tablename in ('program_applications','organization_committees','organization_committee_members','membership_payments') order by tablename,policyname;
-- Legacy amounts may differ from 500 and must not be rewritten.
select status,currency,total_amount,count(*) as records from public.membership_payments group by status,currency,total_amount order by total_amount,status;
rollback;
