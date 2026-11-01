-- Committee & Designation Management Phase 1
-- Central / District / Taluka committee records and office-bearer assignment.

create table if not exists public.organization_designations (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('central', 'district', 'taluka')),
  title text not null,
  sort_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, title)
);

create table if not exists public.organization_committees (
  id uuid primary key default gen_random_uuid(),
  committee_type text not null check (committee_type in ('central', 'district', 'taluka')),
  name text not null,
  district text,
  taluka text,
  tenure_start date,
  tenure_end date,
  status text not null default 'active' check (status in ('active', 'suspended', 'completed', 'resigned')),
  public_display boolean not null default true,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_committee_members (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.organization_committees(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  designation_id uuid references public.organization_designations(id) on delete set null,
  designation_title text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'completed', 'resigned')),
  sort_order integer not null default 1,
  tenure_start date,
  tenure_end date,
  appointment_notes text,
  member_no_snapshot text,
  full_name_snapshot text not null,
  father_name_snapshot text,
  district_snapshot text,
  taluka_snapshot text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (committee_id, member_id, designation_title)
);

create index if not exists organization_committees_type_idx
  on public.organization_committees (committee_type);

create index if not exists organization_committees_status_idx
  on public.organization_committees (status);

create index if not exists organization_committees_location_idx
  on public.organization_committees (district, taluka);

create index if not exists organization_committee_members_committee_idx
  on public.organization_committee_members (committee_id, sort_order);

create index if not exists organization_committee_members_member_idx
  on public.organization_committee_members (member_id);

create index if not exists organization_designations_scope_idx
  on public.organization_designations (scope, sort_order);

create or replace function public.touch_organization_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_organization_designations_updated_at on public.organization_designations;
create trigger touch_organization_designations_updated_at
before update on public.organization_designations
for each row execute function public.touch_organization_updated_at();

drop trigger if exists touch_organization_committees_updated_at on public.organization_committees;
create trigger touch_organization_committees_updated_at
before update on public.organization_committees
for each row execute function public.touch_organization_updated_at();

drop trigger if exists touch_organization_committee_members_updated_at on public.organization_committee_members;
create trigger touch_organization_committee_members_updated_at
before update on public.organization_committee_members
for each row execute function public.touch_organization_updated_at();

create or replace function public.current_user_can_manage_organization()
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
      and ur.role::text in ('admin', 'super_admin')
  );
$$;

alter table public.organization_designations enable row level security;
alter table public.organization_committees enable row level security;
alter table public.organization_committee_members enable row level security;

drop policy if exists "Admins can read designations" on public.organization_designations;
create policy "Admins can read designations"
  on public.organization_designations
  for select
  using (public.current_user_can_manage_organization());

drop policy if exists "Admins can manage designations" on public.organization_designations;
create policy "Admins can manage designations"
  on public.organization_designations
  for all
  using (public.current_user_can_manage_organization())
  with check (public.current_user_can_manage_organization());

drop policy if exists "Admins can read committees" on public.organization_committees;
create policy "Admins can read committees"
  on public.organization_committees
  for select
  using (public.current_user_can_manage_organization());

drop policy if exists "Admins can manage committees" on public.organization_committees;
create policy "Admins can manage committees"
  on public.organization_committees
  for all
  using (public.current_user_can_manage_organization())
  with check (public.current_user_can_manage_organization());

drop policy if exists "Admins can read committee members" on public.organization_committee_members;
create policy "Admins can read committee members"
  on public.organization_committee_members
  for select
  using (public.current_user_can_manage_organization());

drop policy if exists "Admins can manage committee members" on public.organization_committee_members;
create policy "Admins can manage committee members"
  on public.organization_committee_members
  for all
  using (public.current_user_can_manage_organization())
  with check (public.current_user_can_manage_organization());

insert into public.organization_designations (scope, title, sort_order) values
  ('central', 'Chairman', 1),
  ('central', 'Senior Vice Chairman', 2),
  ('central', 'Vice Chairman', 3),
  ('central', 'General Secretary', 4),
  ('central', 'Finance Secretary', 5),
  ('central', 'Information Secretary', 6),
  ('district', 'District President', 1),
  ('district', 'District General Secretary', 2),
  ('district', 'District Finance Secretary', 3),
  ('district', 'District Information Secretary', 4),
  ('district', 'District Coordinator', 5),
  ('taluka', 'Taluka President', 1),
  ('taluka', 'Taluka General Secretary', 2),
  ('taluka', 'Taluka Coordinator', 3),
  ('taluka', 'Taluka Finance Secretary', 4),
  ('taluka', 'Taluka Information Secretary', 5)
on conflict (scope, title) do update set
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
