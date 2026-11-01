-- JAS P0.2: explicit privileges for the existing RLS-protected module tables.
-- No global/default table grants, RLS bypass, service-only queue grants or data reset.
begin;
do $$
declare t text;
begin
  foreach t in array array[
    'program_applications','program_documents','program_admin_assignments',
    'organization_committees','organization_designations','organization_committee_members',
    'finance_donations','finance_expenses','finance_audit_logs',
    'cms_pages','news_posts','gallery_items','events'
  ] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity and c.relkind='r') then
      raise exception 'Expected RLS-protected table public.% is missing or RLS is disabled', t;
    end if;
  end loop;
end $$;
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.program_applications, public.program_documents,
  public.program_admin_assignments, public.organization_committees, public.organization_designations,
  public.organization_committee_members, public.cms_pages, public.news_posts,
  public.gallery_items, public.events to authenticated;
grant select, insert, update on public.finance_donations, public.finance_expenses to authenticated;
grant select, insert on public.finance_audit_logs to authenticated;
-- Published/active public-read policies already exist on exactly these tables.
grant select on public.cms_pages, public.news_posts, public.gallery_items, public.events to anon;
grant select, insert, update, delete on public.program_applications, public.program_documents,
  public.program_admin_assignments, public.organization_committees, public.organization_designations,
  public.organization_committee_members, public.finance_donations, public.finance_expenses,
  public.finance_audit_logs, public.cms_pages, public.news_posts, public.gallery_items,
  public.events, public.membership_payments to service_role;
-- UUID keys on these tables need no sequence grant.

-- SECURITY INVOKER: the caller's existing program/area RLS still applies.
create or replace view public.health_application_summaries with (security_invoker=true) as
select id, application_no, applicant_name, membership_no, relationship_to_member, phone,
  district, taluka, program_key, status, assigned_admin_id, approved_amount, submitted_at, created_at,
  jsonb_strip_nulls(jsonb_build_object(
    'case_priority', details->'case_priority', 'emergency', details->'emergency',
    'health_committee_decision', details->'health_committee_decision',
    'health_committee_reviewed_at', details->'health_committee_reviewed_at',
    'payment_status', details->'payment_status', 'required_amount', details->'required_amount'
  )) as details
from public.program_applications where program_key='health';
grant select on public.health_application_summaries to authenticated;
comment on view public.health_application_summaries is 'Operational summary only. Clinical detail remains in the authorized case detail workflow.';
-- Public organization pages use an allowlisted directory RPC. Do not expose
-- raw member/assignment IDs or internal notes merely to repair admin privileges.
revoke select on public.organization_committees,public.organization_designations,public.organization_committee_members from anon;
drop policy if exists "Public can read active displayed committees" on public.organization_committees;
drop policy if exists "Public can read active public committee members" on public.organization_committee_members;
create or replace function public.get_public_committee_directory(_committee_id uuid default null)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'committee_type',c.committee_type,'name',c.name,'division',c.division,
    'district',c.district,'taluka',c.taluka,'tenure_start',c.tenure_start,'tenure_end',c.tenure_end,
    'status',c.status,'public_display',true,'notes',null,'created_at',c.created_at,'updated_at',c.updated_at,
    'member_count',(select count(*) from public.organization_committee_members a where a.committee_id=c.id
      and a.status='active' and (a.tenure_start is null or a.tenure_start<=current_date) and (a.tenure_end is null or a.tenure_end>=current_date)),
    'members',case when _committee_id is null then '[]'::jsonb else
      (select coalesce(jsonb_agg(jsonb_build_object(
        'id','JAS-OB-'||extract(year from a.created_at at time zone 'UTC')::int::text||'-'||upper(left(replace(a.id::text,'-',''),8)),
        'designation_title',a.designation_title,'status',a.status,'sort_order',a.sort_order,
        'tenure_start',a.tenure_start,'tenure_end',a.tenure_end,'member_no_snapshot',a.member_no_snapshot,
        'full_name_snapshot',a.full_name_snapshot,'father_name_snapshot',a.father_name_snapshot,
        'district_snapshot',a.district_snapshot,'taluka_snapshot',a.taluka_snapshot,
        'created_at',a.created_at,'updated_at',a.updated_at
      ) order by a.sort_order,a.created_at,a.id),'[]'::jsonb) from public.organization_committee_members a
       where a.committee_id=c.id and a.status='active'
         and (a.tenure_start is null or a.tenure_start<=current_date) and (a.tenure_end is null or a.tenure_end>=current_date)) end
  ) order by c.committee_type,c.created_at,c.id),'[]'::jsonb)
  from public.organization_committees c where c.public_display and c.status='active'
    and (_committee_id is null or c.id=_committee_id);
$$;
revoke all on function public.get_public_committee_directory(uuid) from public;
grant execute on function public.get_public_committee_directory(uuid) to anon,authenticated;
-- Restoring INSERT privileges must not let applicants create pre-approved cases
-- or pre-verified documents through a crafted REST payload.
create or replace function public.guard_program_initial_submission()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.role()='service_role' then return new; end if;
  if tg_table_name='program_applications' then
    if new.status<>'submitted' or new.assigned_admin_id is not null or new.admin_remarks is not null
      or new.approved_amount is not null or new.reviewed_at is not null or new.approved_at is not null or new.completed_at is not null then
      raise exception 'Applications must be submitted for review before administrative decisions.';
    end if;
  else
    if new.verification_status<>'pending' or new.is_verified or new.verified_by is not null or new.verified_at is not null or new.admin_note is not null then
      raise exception 'Documents must be submitted for verification.';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_program_initial_submission() from public,anon,authenticated;
create trigger p02_program_initial_submission before insert on public.program_applications
  for each row execute function public.guard_program_initial_submission();
create trigger p02_program_initial_document before insert on public.program_documents
  for each row execute function public.guard_program_initial_submission();

-- Existing finance RLS controls read/review areas. Financial approvals also need
-- the separate approve permission, including when a crafted INSERT is used.
create or replace function public.guard_finance_approval_permission()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.role()='service_role' then return new; end if;
  if new.status in ('approved','paid','rejected') then
    if not public.current_user_can_access_finance_area(new.district,new.taluka,'approve') then
      raise exception 'Finance approval permission is required for this area.';
    end if;
    if tg_op='UPDATE' and not public.current_user_can_access_finance_area(old.district,old.taluka,'approve') then
      raise exception 'Finance approval permission is required for the current record area.';
    end if;
    if new.status='approved' then new.approved_by:=auth.uid(); new.approved_at:=now();
    elsif new.status='rejected' then new.rejected_by:=auth.uid(); new.rejected_at:=now();
    elsif tg_table_name='finance_expenses' and new.status='paid' then new.paid_by:=auth.uid(); new.paid_at:=now(); end if;
  elsif tg_op='UPDATE' and old.status in ('approved','paid','rejected') then
    if not public.current_user_can_access_finance_area(old.district,old.taluka,'approve') then
      raise exception 'Finance approval permission is required to change a reviewed record.';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_finance_approval_permission() from public,anon,authenticated;
create trigger p02_finance_approval before insert or update on public.finance_donations
  for each row execute function public.guard_finance_approval_permission();
create trigger p02_finance_approval before insert or update on public.finance_expenses
  for each row execute function public.guard_finance_approval_permission();
notify pgrst, 'reload schema';
commit;
