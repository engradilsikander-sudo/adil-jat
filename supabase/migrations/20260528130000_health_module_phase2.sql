-- =====================================================
-- JAS Health Program Module - Phase 2
-- Priority queue, committee review metadata,
-- report filters, and professional sequential case numbers.
-- =====================================================

-- =====================================================
-- 1. PROGRAM APPLICATION COUNTERS
-- Creates sequential program case numbers like:
-- JAS-HEALTH-2026-0001
-- =====================================================

create table if not exists public.program_application_counters (
  program_key public.program_key not null,
  year integer not null,
  last_seq integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (program_key, year)
);

alter table public.program_application_counters enable row level security;

drop policy if exists "Super admin can view program application counters"
on public.program_application_counters;

create policy "Super admin can view program application counters"
on public.program_application_counters
for select
to authenticated
using (public.current_user_is_super_admin());

drop policy if exists "Super admin can manage program application counters"
on public.program_application_counters;

create policy "Super admin can manage program application counters"
on public.program_application_counters
for all
to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

-- =====================================================
-- 2. PROFESSIONAL CASE NUMBER FUNCTION
-- Existing application_no values are preserved.
-- New health cases become JAS-HEALTH-YYYY-0001.
-- =====================================================

create or replace function public.set_program_application_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  current_year integer;
  next_seq integer;
begin
  if new.application_no is not null and length(trim(new.application_no)) > 0 then
    return new;
  end if;

  code :=
    case new.program_key
      when 'education' then 'EDU'
      when 'health' then 'HEALTH'
      when 'employment' then 'EMP'
      when 'ration' then 'RATION'
      when 'welfare' then 'WELFARE'
      when 'membership' then 'MEM'
      else 'APP'
    end;

  current_year := extract(year from now())::integer;

  insert into public.program_application_counters (program_key, year, last_seq)
  values (new.program_key, current_year, 1)
  on conflict (program_key, year)
  do update
  set
    last_seq = public.program_application_counters.last_seq + 1,
    updated_at = now()
  returning last_seq into next_seq;

  new.application_no :=
    'JAS-' || code || '-' || current_year::text || '-' || lpad(next_seq::text, 4, '0');

  return new;
end;
$$;

-- =====================================================
-- 3. HEALTH PHASE 2 INDEXES
-- JSONB details are used for health-specific fields.
-- =====================================================

create index if not exists program_applications_health_priority_idx
on public.program_applications ((details->>'case_priority'), created_at desc)
where program_key = 'health';

create index if not exists program_applications_health_committee_decision_idx
on public.program_applications ((details->>'health_committee_decision'), status, created_at desc)
where program_key = 'health';

create index if not exists program_applications_health_payment_status_idx
on public.program_applications ((details->>'payment_status'), status, created_at desc)
where program_key = 'health';

-- =====================================================
-- 4. DOCUMENTATION COMMENTS
-- =====================================================

comment on table public.program_application_counters is
'Per-program annual counters for professional application/case numbers.';

comment on index public.program_applications_health_priority_idx is
'Health admin Phase 2: priority queue filtering and emergency-first workflows.';

comment on index public.program_applications_health_committee_decision_idx is
'Health admin Phase 2: committee decision filtering and reports.';

comment on index public.program_applications_health_payment_status_idx is
'Health admin Phase 2: payment status filtering and reports.';

-- =====================================================
-- END MIGRATION
-- =====================================================
