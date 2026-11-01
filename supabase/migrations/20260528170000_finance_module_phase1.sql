-- =====================================================
-- JAS Finance Module - Phase 1
-- Internal donation and expense tracking with restricted
-- finance-admin access, approvals, audit logs and private
-- receipt/document storage.
-- =====================================================

-- =====================================================
-- 1. FINANCE ACCESS FUNCTION
-- finance_admin enum value is added in separate migration:
-- 20260528165900_add_finance_admin_role.sql
-- =====================================================

create or replace function public.current_user_can_manage_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text in ('admin', 'super_admin', 'finance_admin')
  );
$$;

revoke all on function public.current_user_can_manage_finance() from public, anon;
grant execute on function public.current_user_can_manage_finance() to authenticated;

-- =====================================================
-- 3. FINANCE TABLES
-- =====================================================

create table if not exists public.finance_donations (
  id uuid primary key default gen_random_uuid(),
  donor_name text not null,
  donor_phone text,
  amount numeric(14, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'bank', 'jazzcash', 'easypaisa', 'manual_transfer')),
  receipt_no text unique,
  purpose text not null check (purpose in ('education', 'health', 'welfare', 'general_fund')),
  district text,
  taluka text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid,
  approved_at timestamptz,
  rejected_by uuid,
  rejected_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_title text not null,
  amount numeric(14, 2) not null check (amount > 0),
  category text not null check (category in ('education', 'health', 'welfare', 'office', 'program', 'transport', 'general')),
  linked_program_key public.program_key,
  linked_application_id uuid references public.program_applications(id) on delete set null,
  payment_method text not null check (payment_method in ('cash', 'bank', 'jazzcash', 'easypaisa', 'manual_transfer')),
  paid_to text not null,
  district text,
  taluka text,
  receipt_no text,
  document_path text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  approved_by uuid,
  approved_at timestamptz,
  rejected_by uuid,
  rejected_at timestamptz,
  paid_by uuid,
  paid_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid default auth.uid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.finance_donations enable row level security;
alter table public.finance_expenses enable row level security;
alter table public.finance_audit_logs enable row level security;

-- =====================================================
-- 4. UPDATED_AT TRIGGERS
-- =====================================================

drop trigger if exists set_finance_donations_updated_at on public.finance_donations;
create trigger set_finance_donations_updated_at
before update on public.finance_donations
for each row execute function public.set_updated_at();

drop trigger if exists set_finance_expenses_updated_at on public.finance_expenses;
create trigger set_finance_expenses_updated_at
before update on public.finance_expenses
for each row execute function public.set_updated_at();

-- =====================================================
-- 5. FINANCE TABLE RLS POLICIES
-- =====================================================

drop policy if exists "Finance admins can view donations" on public.finance_donations;
create policy "Finance admins can view donations"
on public.finance_donations
for select
to authenticated
using (public.current_user_can_manage_finance());

drop policy if exists "Finance admins can insert donations" on public.finance_donations;
create policy "Finance admins can insert donations"
on public.finance_donations
for insert
to authenticated
with check (public.current_user_can_manage_finance());

drop policy if exists "Finance admins can update donations" on public.finance_donations;
create policy "Finance admins can update donations"
on public.finance_donations
for update
to authenticated
using (public.current_user_can_manage_finance())
with check (public.current_user_can_manage_finance());

drop policy if exists "Finance admins can view expenses" on public.finance_expenses;
create policy "Finance admins can view expenses"
on public.finance_expenses
for select
to authenticated
using (public.current_user_can_manage_finance());

drop policy if exists "Finance admins can insert expenses" on public.finance_expenses;
create policy "Finance admins can insert expenses"
on public.finance_expenses
for insert
to authenticated
with check (public.current_user_can_manage_finance());

drop policy if exists "Finance admins can update expenses" on public.finance_expenses;
create policy "Finance admins can update expenses"
on public.finance_expenses
for update
to authenticated
using (public.current_user_can_manage_finance())
with check (public.current_user_can_manage_finance());

drop policy if exists "Finance admins can view audit logs" on public.finance_audit_logs;
create policy "Finance admins can view audit logs"
on public.finance_audit_logs
for select
to authenticated
using (public.current_user_can_manage_finance());

drop policy if exists "Finance admins can insert audit logs" on public.finance_audit_logs;
create policy "Finance admins can insert audit logs"
on public.finance_audit_logs
for insert
to authenticated
with check (public.current_user_can_manage_finance());

-- =====================================================
-- 6. INDEXES
-- =====================================================

create index if not exists finance_donations_status_created_idx
on public.finance_donations(status, created_at desc);

create index if not exists finance_donations_purpose_created_idx
on public.finance_donations(purpose, created_at desc);

create index if not exists finance_donations_district_taluka_idx
on public.finance_donations(district, taluka, created_at desc);

create index if not exists finance_expenses_status_created_idx
on public.finance_expenses(status, created_at desc);

create index if not exists finance_expenses_category_created_idx
on public.finance_expenses(category, created_at desc);

create index if not exists finance_expenses_program_idx
on public.finance_expenses(linked_program_key, created_at desc);

create index if not exists finance_expenses_district_taluka_idx
on public.finance_expenses(district, taluka, created_at desc);

create index if not exists finance_audit_logs_entity_idx
on public.finance_audit_logs(entity_type, entity_id, created_at desc);

create index if not exists finance_audit_logs_actor_idx
on public.finance_audit_logs(actor_user_id, created_at desc);

-- =====================================================
-- 7. PRIVATE FINANCE DOCUMENT STORAGE BUCKET
-- =====================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'finance-documents',
  'finance-documents',
  false,
  8388608,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Finance admins upload finance documents" on storage.objects;
create policy "Finance admins upload finance documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'finance-documents'
  and public.current_user_can_manage_finance()
);

drop policy if exists "Finance admins view finance documents" on storage.objects;
create policy "Finance admins view finance documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'finance-documents'
  and public.current_user_can_manage_finance()
);

drop policy if exists "Finance admins update finance documents" on storage.objects;
create policy "Finance admins update finance documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'finance-documents'
  and public.current_user_can_manage_finance()
)
with check (
  bucket_id = 'finance-documents'
  and public.current_user_can_manage_finance()
);

-- =====================================================
-- 8. COMMENTS
-- =====================================================

comment on table public.finance_donations is
'JAS Finance Phase 1 donation records with approval status.';

comment on table public.finance_expenses is
'JAS Finance Phase 1 expense records with approval, paid status and optional private receipt/document path.';

comment on table public.finance_audit_logs is
'Append-only style audit log for sensitive finance actions created by the app.';

comment on function public.current_user_can_manage_finance() is
'Returns true when the current user has admin, super_admin or finance_admin role.';

-- =====================================================
-- END MIGRATION
-- =====================================================
