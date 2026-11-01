-- Jatt Alliance Sindh (JAS) Membership Platform
-- Combined clean initial schema:
-- profiles + members + user_roles + member_counters + member-photos
-- Secure RLS + private helper functions + service-role-only admin RPC
-- Includes Phase 2.5 member profile/card-back fields.

create extension if not exists "pgcrypto";

-- =========================
-- Enums
-- =========================

create type public.app_role as enum ('admin');

create type public.member_status as enum (
  'pending',
  'approved',
  'rejected'
);

-- =========================
-- Private schema
-- =========================

create schema if not exists app_private;

revoke all on schema app_private from public;
revoke all on schema app_private from anon;
revoke all on schema app_private from authenticated;

grant usage on schema app_private to authenticated;
grant usage on schema app_private to service_role;

-- =========================
-- Tables
-- =========================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),

  unique (user_id, role)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null unique references auth.users(id) on delete cascade,

  member_no text unique,

  full_name text not null,
  father_name text not null,

  cnic text not null unique,
  mobile text not null,

  district text not null,
  taluka text,

  profession text,
  caste_branch text,

  -- Card backside / complete profile fields
  address text,
  date_of_birth date,
  gender text,
  education text,
  blood_group text,
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_mobile text,
  declaration_accepted boolean not null default false,

  -- This stores Supabase Storage object path, for example:
  -- user_id/photo.jpg
  photo_url text not null,

  status public.member_status not null default 'pending',

  rejection_reason text,

  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  approved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint members_cnic_format_check
  check (
    cnic ~ '^[0-9]{5}-[0-9]{7}-[0-9]$'
  ),

  constraint members_mobile_format_check
  check (
    mobile ~ '^(\+92|0)3[0-9]{9}$'
  ),

  constraint members_emergency_mobile_format_check
  check (
    emergency_contact_mobile is null
    or emergency_contact_mobile = ''
    or emergency_contact_mobile ~ '^(\+92|0)3[0-9]{9}$'
  ),

  constraint members_gender_check
  check (
    gender is null
    or gender in ('Male', 'Female', 'Other', 'Prefer not to say')
  ),

  constraint members_blood_group_check
  check (
    blood_group is null
    or blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
  ),

  constraint members_district_check
  check (
    district in (
      'Badin',
      'Dadu',
      'Ghotki',
      'Hyderabad',
      'Jacobabad',
      'Jamshoro',
      'Karachi Central',
      'Karachi East',
      'Karachi South',
      'Karachi West',
      'Kashmore',
      'Keamari',
      'Khairpur',
      'Korangi',
      'Larkana',
      'Malir',
      'Matiari',
      'Mirpur Khas',
      'Naushahro Firoze',
      'Qambar Shahdadkot',
      'Sanghar',
      'Shaheed Benazirabad',
      'Shikarpur',
      'Sujawal',
      'Sukkur',
      'Tando Allahyar',
      'Tando Muhammad Khan',
      'Tharparkar',
      'Thatta',
      'Umerkot'
    )
  )
);

create table public.member_counters (
  year int primary key,
  last_seq int not null default 0
);

-- =========================
-- Indexes
-- =========================

create index members_user_id_idx
on public.members(user_id);

create index members_status_idx
on public.members(status);

create index members_district_idx
on public.members(district);

create index members_created_at_idx
on public.members(created_at desc);

create index members_member_no_idx
on public.members(member_no);

create index members_cnic_idx
on public.members(cnic);

create index members_mobile_idx
on public.members(mobile);

create index user_roles_user_id_idx
on public.user_roles(user_id);

-- =========================
-- Private helper functions
-- =========================

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.has_role(
  _user_id uuid,
  _role public.app_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function app_private.protect_member_update()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
  -- Server/service role is allowed to perform approval/rejection transitions.
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Members cannot transfer ownership.
  if new.user_id is distinct from old.user_id then
    raise exception 'Member ownership cannot be changed.';
  end if;

  -- Direct client updates must never change card/approval fields.
  if new.member_no is distinct from old.member_no
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.approved_at is distinct from old.approved_at
  then
    raise exception 'Review/card fields can only be changed by server-side admin actions.';
  end if;

  -- Pending form edits must stay pending and cannot set rejection reason.
  if old.status = 'pending' then
    if new.status is distinct from 'pending'::public.member_status
      or new.rejection_reason is not null
    then
      raise exception 'Pending applications can only be edited as pending.';
    end if;

    return new;
  end if;

  -- Rejected form resubmission is allowed only by resetting status to pending
  -- and clearing rejection reason.
  if old.status = 'rejected' then
    if new.status is distinct from 'pending'::public.member_status
      or new.rejection_reason is not null
    then
      raise exception 'Rejected applications can only be resubmitted as pending.';
    end if;

    return new;
  end if;

  -- Approved forms cannot be edited by client users.
  if old.status = 'approved' then
    raise exception 'Approved membership forms cannot be edited.';
  end if;

  return new;
end;
$$;

-- =========================
-- Triggers
-- =========================

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function app_private.handle_new_user();

create trigger members_set_updated_at
before update on public.members
for each row
execute function app_private.set_updated_at();

create trigger members_protect_update
before update on public.members
for each row
execute function app_private.protect_member_update();

-- =========================
-- Service-role-only admin RPC
-- These are intended to be called from TanStack server functions
-- using SUPABASE_SERVICE_ROLE_KEY, not directly from browser clients.
-- =========================

create or replace function public.approve_member(
  _member_id uuid,
  _reviewed_by uuid default null
)
returns public.members
language plpgsql
security definer
set search_path = app_private, public
as $$
declare
  current_year int;
  next_seq int;
  generated_no text;
  approved_member public.members;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only service role can approve members.';
  end if;

  if _reviewed_by is not null
    and not app_private.has_role(_reviewed_by, 'admin')
  then
    raise exception 'Reviewer must be an admin.';
  end if;

  if not exists (
    select 1
    from public.members
    where id = _member_id
      and status = 'pending'
  ) then
    raise exception 'Pending member application not found.';
  end if;

  current_year := extract(year from now())::int;

  insert into public.member_counters (year, last_seq)
  values (current_year, 1)
  on conflict (year)
  do update set last_seq = public.member_counters.last_seq + 1
  returning last_seq into next_seq;

  generated_no := 'JAS-' || current_year || '-' || lpad(next_seq::text, 4, '0');

  update public.members
  set
    member_no = generated_no,
    status = 'approved',
    rejection_reason = null,
    reviewed_by = _reviewed_by,
    reviewed_at = now(),
    approved_at = now()
  where id = _member_id
    and status = 'pending'
  returning * into approved_member;

  return approved_member;
end;
$$;

create or replace function public.reject_member(
  _member_id uuid,
  _rejection_reason text,
  _reviewed_by uuid default null
)
returns public.members
language plpgsql
security definer
set search_path = app_private, public
as $$
declare
  rejected_member public.members;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only service role can reject members.';
  end if;

  if _rejection_reason is null or length(trim(_rejection_reason)) < 3 then
    raise exception 'Rejection reason is required.';
  end if;

  if _reviewed_by is not null
    and not app_private.has_role(_reviewed_by, 'admin')
  then
    raise exception 'Reviewer must be an admin.';
  end if;

  update public.members
  set
    status = 'rejected',
    rejection_reason = trim(_rejection_reason),
    reviewed_by = _reviewed_by,
    reviewed_at = now(),
    approved_at = null
  where id = _member_id
    and status = 'pending'
  returning * into rejected_member;

  if rejected_member.id is null then
    raise exception 'Pending member application not found.';
  end if;

  return rejected_member;
end;
$$;

-- =========================
-- Enable RLS
-- =========================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.members enable row level security;
alter table public.member_counters enable row level security;

-- =========================
-- Profiles RLS
-- =========================

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or app_private.has_role((select auth.uid()), 'admin')
);

-- =========================
-- User roles RLS
-- Only admins can read roles.
-- No client insert/update/delete policies.
-- First admin is inserted manually/server-side.
-- =========================

create policy "user_roles_select_admin_only"
on public.user_roles
for select
to authenticated
using (
  app_private.has_role((select auth.uid()), 'admin')
);

-- =========================
-- Members RLS
-- =========================

create policy "members_select_own_or_admin"
on public.members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or app_private.has_role((select auth.uid()), 'admin')
);

create policy "members_insert_own_pending"
on public.members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and member_no is null
  and rejection_reason is null
  and reviewed_by is null
  and reviewed_at is null
  and approved_at is null
);

create policy "members_update_own_pending_or_rejected"
on public.members
for update
to authenticated
using (
  user_id = (select auth.uid())
  and status in ('pending', 'rejected')
)
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and member_no is null
  and rejection_reason is null
  and approved_at is null
);

create policy "members_admin_select_update_all"
on public.members
for update
to authenticated
using (
  app_private.has_role((select auth.uid()), 'admin')
)
with check (
  app_private.has_role((select auth.uid()), 'admin')
);

-- =========================
-- Member counters RLS
-- =========================

create policy "member_counters_admin_select"
on public.member_counters
for select
to authenticated
using (
  app_private.has_role((select auth.uid()), 'admin')
);

-- =========================
-- Storage bucket: member-photos
-- Private bucket. Use signed URLs for admin/dashboard/verification display.
-- =========================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'member-photos',
  'member-photos',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =========================
-- Storage RLS: member-photos
-- Path convention:
-- member-photos/{user_id}/photo.jpg
-- =========================

create policy "member_photos_select_own_or_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or app_private.has_role((select auth.uid()), 'admin')
  )
);

create policy "member_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "member_photos_update_own_or_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or app_private.has_role((select auth.uid()), 'admin')
  )
)
with check (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or app_private.has_role((select auth.uid()), 'admin')
  )
);

create policy "member_photos_delete_own_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or app_private.has_role((select auth.uid()), 'admin')
  )
);

-- =========================
-- Grants
-- =========================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
on all tables in schema public
to authenticated, service_role;

grant usage on schema app_private to authenticated, service_role;

-- RLS policies need authenticated users to execute role checker.
grant execute on function app_private.has_role(uuid, public.app_role)
to authenticated;

grant execute on function app_private.has_role(uuid, public.app_role)
to service_role;

-- Service role can execute private helper/admin-bootstrap functions.
grant execute on all functions in schema app_private
to service_role;

-- Lock down public RPC function execution.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

-- Lock down private helper functions from public/anon.
revoke execute on all functions in schema app_private from public;
revoke execute on all functions in schema app_private from anon;

-- Re-grant required private helper after broad revoke.
grant execute on function app_private.has_role(uuid, public.app_role)
to authenticated;

grant execute on function app_private.has_role(uuid, public.app_role)
to service_role;

grant execute on all functions in schema app_private
to service_role;

-- Only server/service role can call admin RPC functions.
grant execute on function public.approve_member(uuid, uuid)
to service_role;

grant execute on function public.reject_member(uuid, text, uuid)
to service_role;

-- Prevent future functions from becoming publicly executable by default.
alter default privileges in schema public
revoke execute on functions from public;

alter default privileges in schema public
revoke execute on functions from anon;

alter default privileges in schema public
revoke execute on functions from authenticated;

alter default privileges in schema app_private
revoke execute on functions from public;

alter default privileges in schema app_private
revoke execute on functions from anon;

alter default privileges in schema app_private
revoke execute on functions from authenticated;