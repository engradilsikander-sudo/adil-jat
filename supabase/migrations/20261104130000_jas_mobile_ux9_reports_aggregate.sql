-- JAS Mobile UX.9: bounded report payloads, full authorized population aggregates.
-- Does not change finance records, existing policies or reporting status definitions.
-- Runs as the caller (RLS remains in force). The report permission predicate
-- additionally prevents rows outside the caller's reporting district/taluka.
create or replace function public.jas_reports_center_summary(_period text default 'all')
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, app_private, pg_temp
as $$
declare
  actor uuid := (select auth.uid());
  cutoff timestamptz;
  payload jsonb;
begin
  if _period is null or _period not in ('all', '6m', '12m') then
    raise exception 'Invalid reports period' using errcode = '22023';
  end if;

  if actor is null or not app_private.user_can_access_area_module(
    actor, 'reports', null, null, 'view'
  ) then
    raise exception 'Reports access required' using errcode = '42501';
  end if;

  cutoff := case _period
    when '6m' then now() - interval '6 months'
    when '12m' then now() - interval '12 months'
    else null
  end;

  with
  -- RLS is applied by PostgreSQL, and report-specific area access is enforced
  -- for *every* source, before grouping or selecting recent activity.
  m as materialized (
    select id, status::text as status, district, taluka, created_at, member_no
    from public.members
    where (cutoff is null or created_at >= cutoff)
      and app_private.user_can_access_area_module(actor, 'reports', district, taluka, 'view')
  ),
  a as materialized (
    select id, program_key::text as program_key, status::text as status,
           district, taluka, created_at, approved_amount
    from public.program_applications
    where program_key::text in ('education', 'health', 'welfare', 'employment')
      and (cutoff is null or created_at >= cutoff)
      and app_private.user_can_access_area_module(actor, 'reports', district, taluka, 'view')
  ),
  d as materialized (
    select id, amount, status, district, taluka, created_at,
           initcap(regexp_replace(coalesce(nullif(btrim(purpose), ''), 'General Fund'), '[[:space:]_-]+', ' ', 'g')) as purpose
    from public.finance_donations
    where (cutoff is null or created_at >= cutoff)
      and app_private.user_can_access_area_module(actor, 'reports', district, taluka, 'view')
  ),
  e as materialized (
    select id, amount, status, district, taluka, created_at,
           initcap(regexp_replace(coalesce(nullif(btrim(coalesce(linked_program_key::text, category)), ''), 'General Fund'), '[[:space:]_-]+', ' ', 'g')) as purpose
    from public.finance_expenses
    where (cutoff is null or created_at >= cutoff)
      and app_private.user_can_access_area_module(actor, 'reports', district, taluka, 'view')
  ),
  fee as materialized (
    select p.id, p.status::text as status, p.total_amount
    from public.membership_payments p
    join public.members m2 on m2.id = p.member_id
    where (cutoff is null or p.created_at >= cutoff)
      and app_private.user_can_access_area_module(actor, 'reports', m2.district, m2.taluka, 'view')
  ),
  counts as (
    select
      (select count(*) from m) as members_total,
      (select count(*) from a) as applications_total,
      (select count(*) from m where status = 'pending') as members_pending,
      (select count(*) from m where status = 'approved') as members_approved,
      (select count(*) from m where status = 'rejected') as members_rejected,
      (select coalesce(sum(total_amount), 0) from fee where status = 'paid') as fees_paid,
      (select count(*) from fee where status = 'pending') as fees_pending,
      (select coalesce(sum(amount), 0) from d where status in ('approved', 'committee_approved', 'paid', 'fund_released')) as donations_amount,
      (select count(*) from d where status in ('approved', 'committee_approved', 'paid', 'fund_released')) as donations_count,
      (select coalesce(sum(amount), 0) from e where status in ('paid', 'completed', 'closed')) as expenses_amount,
      (select count(*) from e where status in ('paid', 'completed', 'closed')) as expenses_count
  ),
  application_totals as (
    select program_key, count(*) total,
      count(*) filter (where status in ('new','submitted','pending','pending_verification')) pending,
      count(*) filter (where status in ('under_review','under_verification','need_more_info','verified')) under_review,
      count(*) filter (where status in ('approved','committee_approved','paid','fund_released')) approved,
      count(*) filter (where status in ('rejected','committee_rejected','not_recommended')) rejected,
      count(*) filter (where status in ('completed','paid_completed','closed','placed','employed')) completed,
      coalesce(sum(approved_amount), 0) approved_amount
    from a group by program_key
  ),
  program_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'programKey', p.key, 'total', coalesce(t.total,0), 'pending', coalesce(t.pending,0),
      'underReview', coalesce(t.under_review,0), 'approved', coalesce(t.approved,0),
      'rejected', coalesce(t.rejected,0), 'completed', coalesce(t.completed,0),
      'approvedAmount', coalesce(t.approved_amount,0)
    ) order by p.ordinal), '[]'::jsonb) value
    from unnest(array['education','health','welfare','employment']) with ordinality p(key,ordinal)
    left join application_totals t on t.program_key = p.key
  ),
  district_parts as (
    select coalesce(nullif(btrim(district), ''), 'Not specified') district,
      count(*) members, count(*) filter (where status = 'approved') approved_members,
      0::bigint applications, 0::numeric donations, 0::numeric expenses
    from m group by 1
    union all
    select coalesce(nullif(btrim(district), ''), 'Not specified'),
      0::bigint, 0::bigint, count(*), 0::numeric, 0::numeric
    from a group by 1
    union all
    select coalesce(nullif(btrim(district), ''), 'Not specified'),
      0::bigint, 0::bigint, 0::bigint, sum(amount), 0::numeric
    from d where status in ('approved','committee_approved','paid','fund_released') group by 1
    union all
    select coalesce(nullif(btrim(district), ''), 'Not specified'),
      0::bigint, 0::bigint, 0::bigint, 0::numeric, sum(amount)
    from e where status in ('paid','completed','closed') group by 1
  ),
  district_groups as (
    select district, sum(members) members, sum(approved_members) approved_members,
      sum(applications) applications, sum(donations) donations, sum(expenses) expenses
    from district_parts group by district
    order by sum(members) + sum(applications) desc, district asc
    limit 12
  ),
  district_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'district', district, 'members', members, 'approvedMembers', approved_members,
      'programApplications', applications, 'approvedDonations', donations,
      'paidExpenses', expenses
    ) order by members + applications desc, district), '[]'::jsonb) value
    from district_groups
  ),
  finance_parts as (
    select purpose, sum(amount) donation_amount, count(*) donation_count,
      0::numeric expense_amount, 0::bigint expense_count
    from d where status in ('approved','committee_approved','paid','fund_released') group by purpose
    union all
    select purpose, 0::numeric, 0::bigint, sum(amount), count(*)
    from e where status in ('paid','completed','closed') group by purpose
  ),
  finance_groups as (
    select purpose, sum(donation_amount) donations, sum(donation_count) donation_count,
      sum(expense_amount) expenses, sum(expense_count) expense_count
    from finance_parts group by purpose
  ),
  finance_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'purpose', purpose, 'approvedDonations', donations,
      'donationCount', donation_count, 'paidExpenses', expenses,
      'expenseCount', expense_count, 'balance', donations - expenses
    ) order by purpose), '[]'::jsonb) value from finance_groups
  ),
  monthly_parts as (
    select to_char(created_at at time zone 'UTC', 'YYYY-MM') as month_key,
      count(*) members, 0::bigint applications, 0::numeric donations, 0::numeric expenses
    from m group by 1
    union all
    select to_char(created_at at time zone 'UTC', 'YYYY-MM'),
      0::bigint, count(*), 0::numeric, 0::numeric from a group by 1
    union all
    select to_char(created_at at time zone 'UTC', 'YYYY-MM'),
      0::bigint, 0::bigint, sum(amount), 0::numeric
    from d where status in ('approved','committee_approved','paid','fund_released') group by 1
    union all
    select to_char(created_at at time zone 'UTC', 'YYYY-MM'),
      0::bigint, 0::bigint, 0::numeric, sum(amount)
    from e where status in ('paid','completed','closed') group by 1
  ),
  monthly_groups as (
    select month_key, sum(members) members, sum(applications) applications,
      sum(donations) donations, sum(expenses) expenses
    from monthly_parts group by month_key
  ),
  monthly_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'month', to_char(s.month_date, 'YYYY-MM'), 'members', coalesce(g.members,0),
      'applications', coalesce(g.applications,0), 'donations', coalesce(g.donations,0),
      'expenses', coalesce(g.expenses,0)
    ) order by s.month_date), '[]'::jsonb) value
    from (
      select (date_trunc('month', now() at time zone 'UTC') - i * interval '1 month') as month_date
      from generate_series(5,0,-1) i
    ) s
    left join monthly_groups g on g.month_key = to_char(s.month_date, 'YYYY-MM')
  ),
  recent_rows as (
    select ('member-' || id::text) rid, 'member' kind, status, created_at, member_no, null::text program_key,
      null::numeric amount, null::text purpose from m
    union all
    select ('program-' || id::text), 'program', status, created_at, null::text, program_key,
      null::numeric, null::text from a
    union all
    select ('donation-' || id::text), 'donation', status, created_at, null::text, null::text,
      amount, purpose from d
    union all
    select ('expense-' || id::text), 'expense', status, created_at, null::text, null::text,
      amount, purpose from e
  ),
  recent_top as (
    select * from recent_rows order by created_at desc, rid desc limit 12
  ),
  recent_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', rid, 'type', kind, 'status', status, 'date', created_at,
      'memberNo', member_no, 'programKey', program_key,
      'amount', amount, 'purpose', purpose
    ) order by created_at desc, rid desc), '[]'::jsonb) value from recent_top
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'period', _period,
    'totals', to_jsonb(c),
    'programSummaries', p.value,
    'districtSummaries', ds.value,
    'financeByPurpose', f.value,
    'monthlySummaries', mo.value,
    'recentActivity', r.value
  ) into payload
  from counts c cross join program_json p cross join district_json ds
  cross join finance_json f cross join monthly_json mo cross join recent_json r;

  return payload;
end;
$$;

revoke all on function public.jas_reports_center_summary(text) from public, anon;
grant execute on function public.jas_reports_center_summary(text) to authenticated;

comment on function public.jas_reports_center_summary(text) is
  'UX.9: RLS + reports-area-scoped, server-side aggregated Reports Center. Explicit all/6m/12m filters; no raw rows returned.';
notify pgrst, 'reload schema';
