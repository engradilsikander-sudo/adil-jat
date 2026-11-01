-- =====================================================
-- JAS Donation Leaderboard - Phase 1
-- Member donation submission, manual finance verification,
-- and approved-member-only donor leaderboard.
-- =====================================================

-- =====================================================
-- 1. DONATION SNAPSHOT / PUBLIC SUBMISSION FIELDS
-- =====================================================

alter table public.finance_donations
  add column if not exists donation_no text unique,
  add column if not exists donor_user_id uuid,
  add column if not exists donor_member_id uuid references public.members(id) on delete set null,
  add column if not exists donor_member_no_snapshot text,
  add column if not exists donor_name_snapshot text,
  add column if not exists donor_father_name_snapshot text,
  add column if not exists donor_district_snapshot text,
  add column if not exists donor_taluka_snapshot text,
  add column if not exists transaction_reference text,
  add column if not exists receipt_file_path text;

create index if not exists finance_donations_donor_member_idx
on public.finance_donations(donor_member_id, status, approved_at desc);

create index if not exists finance_donations_donation_no_idx
on public.finance_donations(donation_no);

create index if not exists finance_donations_transaction_reference_idx
on public.finance_donations(transaction_reference);

-- =====================================================
-- 2. DONATION NUMBER COUNTER
-- =====================================================

create table if not exists public.finance_donation_counters (
  year integer primary key,
  last_seq integer not null default 0
);

alter table public.finance_donation_counters enable row level security;

drop policy if exists "Finance admins view donation counters" on public.finance_donation_counters;
create policy "Finance admins view donation counters"
on public.finance_donation_counters
for select
to authenticated
using (public.current_user_can_manage_finance());

create or replace function public.set_finance_donation_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year integer := extract(year from now())::integer;
  next_seq integer;
begin
  if new.donation_no is not null and length(trim(new.donation_no)) > 0 then
    return new;
  end if;

  insert into public.finance_donation_counters(year, last_seq)
  values (current_year, 1)
  on conflict (year)
  do update set last_seq = public.finance_donation_counters.last_seq + 1
  returning last_seq into next_seq;

  new.donation_no := 'DON-' || current_year || '-' || lpad(next_seq::text, 5, '0');
  return new;
end;
$$;

drop trigger if exists set_finance_donation_no_before_insert on public.finance_donations;
create trigger set_finance_donation_no_before_insert
before insert on public.finance_donations
for each row execute function public.set_finance_donation_no();

-- =====================================================
-- 3. MEMBER ACCESS HELPERS
-- =====================================================

create or replace function public.current_user_is_approved_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.user_id = auth.uid()
      and m.status = 'approved'
      and m.member_no is not null
  );
$$;

create or replace function public.current_user_can_view_donor_leaderboard()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_approved_member()
    or public.current_user_can_manage_finance();
$$;

revoke all on function public.current_user_is_approved_member() from public, anon;
revoke all on function public.current_user_can_view_donor_leaderboard() from public, anon;
grant execute on function public.current_user_is_approved_member() to authenticated;
grant execute on function public.current_user_can_view_donor_leaderboard() to authenticated;

-- =====================================================
-- 4. RLS FOR MEMBER DONATION SUBMISSION
-- =====================================================

drop policy if exists "Approved members can submit own donations" on public.finance_donations;
create policy "Approved members can submit own donations"
on public.finance_donations
for insert
to authenticated
with check (
  donor_user_id = auth.uid()
  and created_by = auth.uid()
  and status = 'pending'
  and exists (
    select 1
    from public.members m
    where m.id = donor_member_id
      and m.user_id = auth.uid()
      and m.status = 'approved'
      and m.member_no is not null
  )
);

drop policy if exists "Approved members can view own donation records" on public.finance_donations;
create policy "Approved members can view own donation records"
on public.finance_donations
for select
to authenticated
using (donor_user_id = auth.uid());

-- =====================================================
-- 5. PRIVATE RECEIPT UPLOAD POLICY FOR MEMBER DONATIONS
-- =====================================================

drop policy if exists "Approved members upload own donation receipts" on storage.objects;
create policy "Approved members upload own donation receipts"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'finance-documents'
  and public.current_user_is_approved_member()
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'donations'
);

drop policy if exists "Approved members view own donation receipts" on storage.objects;
create policy "Approved members view own donation receipts"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'finance-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'donations'
);

-- =====================================================
-- 6. MEMBER-ONLY DONOR LEADERBOARD RPC
-- =====================================================

create or replace function public.get_donor_leaderboard(_limit integer default 50)
returns table (
  donor_member_id uuid,
  donor_name text,
  donor_father_name text,
  donor_member_no text,
  donor_district text,
  donor_taluka text,
  total_donated numeric,
  donation_count bigint,
  purposes text[],
  first_approved_at timestamptz,
  latest_approved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.current_user_can_view_donor_leaderboard() then
    raise exception 'Donor leaderboard is available only for approved JAS members.';
  end if;

  return query
  select
    fd.donor_member_id,
    coalesce(fd.donor_name_snapshot, fd.donor_name) as donor_name,
    coalesce(fd.donor_father_name_snapshot, '-') as donor_father_name,
    coalesce(fd.donor_member_no_snapshot, '-') as donor_member_no,
    max(coalesce(fd.donor_district_snapshot, fd.district)) as donor_district,
    max(coalesce(fd.donor_taluka_snapshot, fd.taluka)) as donor_taluka,
    sum(fd.amount)::numeric as total_donated,
    count(*)::bigint as donation_count,
    array_agg(distinct fd.purpose order by fd.purpose) as purposes,
    min(fd.approved_at) as first_approved_at,
    max(fd.approved_at) as latest_approved_at
  from public.finance_donations fd
  where fd.status = 'approved'
    and fd.donor_member_id is not null
  group by
    fd.donor_member_id,
    coalesce(fd.donor_name_snapshot, fd.donor_name),
    coalesce(fd.donor_father_name_snapshot, '-'),
    coalesce(fd.donor_member_no_snapshot, '-')
  order by
    sum(fd.amount) desc,
    count(*) desc,
    min(fd.approved_at) asc nulls last
  limit greatest(1, least(coalesce(_limit, 50), 100));
end;
$$;

revoke all on function public.get_donor_leaderboard(integer) from public, anon;
grant execute on function public.get_donor_leaderboard(integer) to authenticated;

comment on function public.get_donor_leaderboard(integer) is
'Member-only donor leaderboard. Returns approved/verified donations aggregated by member.';

comment on column public.finance_donations.donation_no is
'Public donation tracking number such as DON-2026-00001.';

comment on column public.finance_donations.receipt_file_path is
'Private storage path for donor uploaded transfer proof or receipt screenshot.';

-- =====================================================
-- END MIGRATION
-- =====================================================
