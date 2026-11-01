-- =====================================================
-- JAS Education / Program Admin System
-- One Supabase backend, multiple program admins,
-- membership number verification, program applications,
-- documents, RLS, and secure admin permissions.
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- 1. APP ROLE ENUM
-- =====================================================

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'app_role'
  ) then
    create type public.app_role as enum (
      'admin',
      'super_admin',
      'membership_admin',
      'education_admin',
      'health_admin',
      'employment_admin',
      'ration_admin',
      'welfare_admin'
    );
  end if;
end $$;

do $$
begin
  alter type public.app_role add value if not exists 'super_admin';
  alter type public.app_role add value if not exists 'membership_admin';
  alter type public.app_role add value if not exists 'education_admin';
  alter type public.app_role add value if not exists 'health_admin';
  alter type public.app_role add value if not exists 'employment_admin';
  alter type public.app_role add value if not exists 'ration_admin';
  alter type public.app_role add value if not exists 'welfare_admin';
exception
  when duplicate_object then null;
end $$;

-- =====================================================
-- 2. PROGRAM KEY ENUM
-- =====================================================

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'program_key'
  ) then
    create type public.program_key as enum (
      'membership',
      'education',
      'health',
      'employment',
      'ration',
      'welfare'
    );
  end if;
end $$;

-- =====================================================
-- 3. PROGRAM APPLICATION STATUS ENUM
-- =====================================================

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'program_application_status'
  ) then
    create type public.program_application_status as enum (
      'submitted',
      'under_review',
      'need_more_info',
      'approved',
      'rejected',
      'paid_completed',
      'completed'
    );
  end if;
end $$;

-- =====================================================
-- 4. RELATIONSHIP ENUM
-- =====================================================

do $$
begin
  if not exists (
    select 1 from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'member_relationship'
  ) then
    create type public.member_relationship as enum (
      'self',
      'son',
      'daughter',
      'father',
      'mother',
      'brother',
      'sister',
      'wife',
      'husband',
      'guardian',
      'other'
    );
  end if;
end $$;

-- =====================================================
-- 5. USER ROLES TABLE
-- If already exists, this will not recreate it.
-- Assumes existing user_roles is compatible:
-- user_id uuid, role public.app_role or role castable to text.
-- =====================================================

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

create unique index if not exists user_roles_user_id_role_key
on public.user_roles(user_id, role);

create index if not exists user_roles_user_id_idx
on public.user_roles(user_id);

alter table public.user_roles enable row level security;

-- =====================================================
-- 6. PROGRAM ADMIN ASSIGNMENTS
-- Use this for district/taluka/program specific admins.
--
-- Important:
-- If a user has education_admin in user_roles, that user is global
-- education admin.
-- If you want district-only admin, do NOT give education_admin role.
-- Add only program_admin_assignments row.
-- =====================================================

create table if not exists public.program_admin_assignments (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  program_key public.program_key not null,

  district text,
  taluka text,

  can_view boolean not null default true,
  can_review boolean not null default true,
  can_approve boolean not null default false,
  can_mark_completed boolean not null default false,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fix for NULL uniqueness issue.
-- This prevents duplicate global/district/taluka assignments.
create unique index if not exists program_admin_assignments_unique_idx
on public.program_admin_assignments (
  user_id,
  program_key,
  coalesce(lower(district), ''),
  coalesce(lower(taluka), '')
);

create index if not exists program_admin_assignments_user_id_idx
on public.program_admin_assignments(user_id);

create index if not exists program_admin_assignments_program_key_idx
on public.program_admin_assignments(program_key);

create index if not exists program_admin_assignments_scope_idx
on public.program_admin_assignments(program_key, district, taluka);

alter table public.program_admin_assignments enable row level security;

-- =====================================================
-- 7. PROGRAM APPLICATIONS TABLE
-- Generic MVP table for:
-- Education, Health, Employment, Ration, Welfare.
--
-- For Education module, details jsonb can store:
-- institute_name, class_degree, board_university, marks,
-- required_amount, support_type, reason, etc.
-- =====================================================

create table if not exists public.program_applications (
  id uuid primary key default gen_random_uuid(),

  application_no text unique,

  program_key public.program_key not null,

  applicant_user_id uuid not null references auth.users(id) on delete cascade,

  -- Linked approved member.
  -- Assumes public.members(id) exists and is uuid.
  member_id uuid references public.members(id) on delete restrict,
  membership_no text not null,

  relationship_to_member public.member_relationship not null default 'self',

  applicant_name text not null,
  applicant_cnic text,
  phone text not null,
  email text,

  district text,
  taluka text,
  address text,

  details jsonb not null default '{}'::jsonb,

  status public.program_application_status not null default 'submitted',

  assigned_admin_id uuid references auth.users(id) on delete set null,
  admin_remarks text,
  approved_amount numeric(12,2),

  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint program_applications_phone_not_empty
    check (length(trim(phone)) >= 5),

  constraint program_applications_membership_no_not_empty
    check (length(trim(membership_no)) >= 1),

  constraint program_applications_applicant_name_not_empty
    check (length(trim(applicant_name)) >= 2)
);

create index if not exists program_applications_program_key_idx
on public.program_applications(program_key);

create index if not exists program_applications_status_idx
on public.program_applications(status);

create index if not exists program_applications_applicant_user_id_idx
on public.program_applications(applicant_user_id);

create index if not exists program_applications_member_id_idx
on public.program_applications(member_id);

create index if not exists program_applications_membership_no_idx
on public.program_applications(membership_no);

create index if not exists program_applications_district_taluka_idx
on public.program_applications(district, taluka);

create index if not exists program_applications_created_at_idx
on public.program_applications(created_at desc);

alter table public.program_applications enable row level security;

-- =====================================================
-- 8. PROGRAM DOCUMENTS TABLE
-- Metadata table for uploaded documents.
-- Files go to Supabase Storage bucket: program-documents
-- =====================================================

create table if not exists public.program_documents (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null references public.program_applications(id) on delete cascade,
  program_key public.program_key not null,

  uploaded_by uuid not null references auth.users(id) on delete cascade,

  document_type text not null,
  file_path text not null,
  file_name text,
  mime_type text,
  file_size bigint,

  verification_status text not null default 'pending',
  is_verified boolean not null default false,
  admin_note text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint program_documents_document_type_not_empty
    check (length(trim(document_type)) >= 2),

  constraint program_documents_file_path_not_empty
    check (length(trim(file_path)) >= 3),

  constraint program_documents_verification_status_check
    check (verification_status in ('pending', 'verified', 'rejected', 'needs_reupload'))
);

create index if not exists program_documents_application_id_idx
on public.program_documents(application_id);

create index if not exists program_documents_uploaded_by_idx
on public.program_documents(uploaded_by);

create index if not exists program_documents_program_key_idx
on public.program_documents(program_key);

create unique index if not exists program_documents_file_path_unique_idx
on public.program_documents(file_path);

alter table public.program_documents enable row level security;

-- =====================================================
-- 9. UPDATED_AT TRIGGER HELPER
-- =====================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_program_admin_assignments_updated_at
on public.program_admin_assignments;

create trigger set_program_admin_assignments_updated_at
before update on public.program_admin_assignments
for each row
execute function public.set_updated_at();

drop trigger if exists set_program_applications_updated_at
on public.program_applications;

create trigger set_program_applications_updated_at
before update on public.program_applications
for each row
execute function public.set_updated_at();

drop trigger if exists set_program_documents_updated_at
on public.program_documents;

create trigger set_program_documents_updated_at
before update on public.program_documents
for each row
execute function public.set_updated_at();

-- =====================================================
-- 10. ROLE / PERMISSION HELPER FUNCTIONS
-- =====================================================

create or replace function public.current_user_has_role(_role text)
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
      and ur.role::text = _role
  );
$$;

create or replace function public.current_user_is_super_admin()
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
      and ur.role::text in ('super_admin', 'admin')
  );
$$;

create or replace function public.current_user_can_view_program(
  _program_key public.program_key,
  _district text default null,
  _taluka text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text = (_program_key::text || '_admin')
    )
    or exists (
      select 1
      from public.program_admin_assignments paa
      where paa.user_id = auth.uid()
        and paa.program_key = _program_key
        and paa.can_view = true
        and (
          paa.district is null
          or (
            _district is not null
            and lower(trim(paa.district)) = lower(trim(_district))
          )
        )
        and (
          paa.taluka is null
          or (
            _taluka is not null
            and lower(trim(paa.taluka)) = lower(trim(_taluka))
          )
        )
    );
$$;

create or replace function public.current_user_can_review_program(
  _program_key public.program_key,
  _district text default null,
  _taluka text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text = (_program_key::text || '_admin')
    )
    or exists (
      select 1
      from public.program_admin_assignments paa
      where paa.user_id = auth.uid()
        and paa.program_key = _program_key
        and paa.can_review = true
        and (
          paa.district is null
          or (
            _district is not null
            and lower(trim(paa.district)) = lower(trim(_district))
          )
        )
        and (
          paa.taluka is null
          or (
            _taluka is not null
            and lower(trim(paa.taluka)) = lower(trim(_taluka))
          )
        )
    );
$$;

create or replace function public.current_user_can_approve_program(
  _program_key public.program_key,
  _district text default null,
  _taluka text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text = (_program_key::text || '_admin')
    )
    or exists (
      select 1
      from public.program_admin_assignments paa
      where paa.user_id = auth.uid()
        and paa.program_key = _program_key
        and paa.can_approve = true
        and (
          paa.district is null
          or (
            _district is not null
            and lower(trim(paa.district)) = lower(trim(_district))
          )
        )
        and (
          paa.taluka is null
          or (
            _taluka is not null
            and lower(trim(paa.taluka)) = lower(trim(_taluka))
          )
        )
    );
$$;

create or replace function public.current_user_can_mark_completed_program(
  _program_key public.program_key,
  _district text default null,
  _taluka text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_super_admin()
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text = (_program_key::text || '_admin')
    )
    or exists (
      select 1
      from public.program_admin_assignments paa
      where paa.user_id = auth.uid()
        and paa.program_key = _program_key
        and paa.can_mark_completed = true
        and (
          paa.district is null
          or (
            _district is not null
            and lower(trim(paa.district)) = lower(trim(_district))
          )
        )
        and (
          paa.taluka is null
          or (
            _taluka is not null
            and lower(trim(paa.taluka)) = lower(trim(_taluka))
          )
        )
    );
$$;

-- Compatibility alias.
-- Older code/policies can still call current_user_can_manage_program().
create or replace function public.current_user_can_manage_program(
  _program_key public.program_key,
  _district text default null,
  _taluka text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_can_view_program(_program_key, _district, _taluka);
$$;

-- =====================================================
-- 11. MEMBERSHIP NO VERIFICATION RPC
--
-- Assumes public.members has:
-- id, membership_no, status, district, taluka
-- and preferably full_name or name.
-- =====================================================

create or replace function public.verify_membership_no(_membership_no text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  member_row jsonb;
begin
  if _membership_no is null or length(trim(_membership_no)) = 0 then
    return jsonb_build_object(
      'valid', false,
      'reason', 'Membership number is required'
    );
  end if;

  select to_jsonb(m)
  into member_row
  from public.members m
  where lower(trim(m.member_no)) = lower(trim(_membership_no))
  limit 1;

  if member_row is null then
    return jsonb_build_object(
      'valid', false,
      'reason', 'Membership number not found'
    );
  end if;

  if lower(coalesce(member_row->>'status', '')) <> 'approved' then
    return jsonb_build_object(
      'valid', false,
      'reason', 'Membership is not approved yet',
      'status', member_row->>'status'
    );
  end if;

  return jsonb_build_object(
    'valid', true,
    'member_id', member_row->>'id',
    'membership_no', member_row->>'member_no',
    'full_name', coalesce(member_row->>'full_name', member_row->>'name'),
    'district', member_row->>'district',
    'taluka', member_row->>'taluka',
    'status', member_row->>'status'
  );
end;
$$;

-- =====================================================
-- 12. AUTO APPLICATION NO
-- =====================================================

create or replace function public.set_program_application_no()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  code text;
begin
  if new.application_no is not null and length(trim(new.application_no)) > 0 then
    return new;
  end if;

  code :=
    case new.program_key
      when 'education' then 'EDU'
      when 'health' then 'HLT'
      when 'employment' then 'EMP'
      when 'ration' then 'RAT'
      when 'welfare' then 'WEL'
      when 'membership' then 'MEM'
      else 'APP'
    end;

  new.application_no :=
    'JAS-' ||
    code ||
    '-' ||
    to_char(now(), 'YYYY') ||
    '-' ||
    upper(substr(replace(new.id::text, '-', ''), 1, 8));

  return new;
end;
$$;

drop trigger if exists set_program_application_no_trigger
on public.program_applications;

create trigger set_program_application_no_trigger
before insert on public.program_applications
for each row
execute function public.set_program_application_no();

-- =====================================================
-- 13. AUTO-LINK MEMBERSHIP NO BEFORE INSERT/UPDATE
-- =====================================================

create or replace function public.link_program_application_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row jsonb;
begin
  if new.membership_no is null or length(trim(new.membership_no)) = 0 then
    raise exception 'Membership number is required.';
  end if;

  select to_jsonb(m)
  into member_row
  from public.members m
  where lower(trim(m.member_no)) = lower(trim(new.membership_no))
  limit 1;

  if member_row is null then
    raise exception 'Invalid membership number. Please enter a valid JAS membership number.';
  end if;

  if lower(coalesce(member_row->>'status', '')) <> 'approved' then
    raise exception 'Membership number exists but member is not approved yet.';
  end if;

  new.member_id = (member_row->>'id')::uuid;
  new.membership_no = trim(member_row->>'member_no');

  if new.district is null or trim(new.district) = '' then
    new.district = member_row->>'district';
  end if;

  if new.taluka is null or trim(new.taluka) = '' then
    new.taluka = member_row->>'taluka';
  end if;

  return new;
end;
$$;

drop trigger if exists link_program_application_member_trigger
on public.program_applications;

create trigger link_program_application_member_trigger
before insert or update of membership_no
on public.program_applications
for each row
execute function public.link_program_application_member();

-- =====================================================
-- 14. ENFORCE PROGRAM APPLICATION UPDATE PERMISSIONS
-- This protects approve/completed/admin fields beyond basic RLS.
-- =====================================================

create or replace function public.enforce_program_application_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
  can_review boolean;
  can_approve boolean;
  can_complete boolean;
begin
  is_owner := old.applicant_user_id = auth.uid();

  can_review := public.current_user_can_review_program(
    old.program_key,
    old.district,
    old.taluka
  );

  can_approve := public.current_user_can_approve_program(
    old.program_key,
    old.district,
    old.taluka
  );

  can_complete := public.current_user_can_mark_completed_program(
    old.program_key,
    old.district,
    old.taluka
  );

  -- Super admins pass all checks because helper functions return true.
  -- Applicant can only update own application while it is still editable.
  if is_owner and not can_review then
    if old.status not in ('submitted', 'need_more_info') then
      raise exception 'You cannot update this application after review has started.';
    end if;

    if new.applicant_user_id is distinct from old.applicant_user_id
      or new.program_key is distinct from old.program_key
      or new.member_id is distinct from old.member_id
      or new.status is distinct from old.status
      or new.assigned_admin_id is distinct from old.assigned_admin_id
      or new.admin_remarks is distinct from old.admin_remarks
      or new.approved_amount is distinct from old.approved_amount
      or new.reviewed_at is distinct from old.reviewed_at
      or new.approved_at is distinct from old.approved_at
      or new.completed_at is distinct from old.completed_at
    then
      raise exception 'You cannot update protected admin fields.';
    end if;

    return new;
  end if;

  -- Admin/reviewer permission required for all admin-side edits.
  if not can_review then
    raise exception 'You do not have permission to update this program application.';
  end if;

  -- Status changes.
  if new.status is distinct from old.status then
    if new.status = 'approved' and not can_approve then
      raise exception 'You do not have permission to approve this application.';
    end if;

    if new.status in ('paid_completed', 'completed') and not can_complete then
      raise exception 'You do not have permission to mark this application as completed.';
    end if;

    if new.status in ('under_review', 'need_more_info', 'rejected') and not can_review then
      raise exception 'You do not have permission to review this application.';
    end if;
  end if;

  -- Approved amount requires approve permission.
  if new.approved_amount is distinct from old.approved_amount and not can_approve then
    raise exception 'You do not have permission to set approved amount.';
  end if;

  -- Completion timestamp requires completion permission.
  if new.completed_at is distinct from old.completed_at and not can_complete then
    raise exception 'You do not have permission to set completion date.';
  end if;

  -- Auto timestamps.
  if new.status is distinct from old.status then
    new.reviewed_at = now();

    if new.status = 'approved' and new.approved_at is null then
      new.approved_at = now();
    end if;

    if new.status in ('paid_completed', 'completed') and new.completed_at is null then
      new.completed_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_program_application_update_permissions_trigger
on public.program_applications;

create trigger enforce_program_application_update_permissions_trigger
before update on public.program_applications
for each row
execute function public.enforce_program_application_update_permissions();

-- =====================================================
-- 15. SYNC PROGRAM DOCUMENT PROGRAM KEY
-- Ensures program_documents.program_key always matches parent application.
-- =====================================================

create or replace function public.sync_program_document_program_key()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_program_key public.program_key;
begin
  select pa.program_key
  into parent_program_key
  from public.program_applications pa
  where pa.id = new.application_id;

  if parent_program_key is null then
    raise exception 'Invalid application_id for program document.';
  end if;

  new.program_key = parent_program_key;

  return new;
end;
$$;

drop trigger if exists sync_program_document_program_key_trigger
on public.program_documents;

create trigger sync_program_document_program_key_trigger
before insert or update of application_id
on public.program_documents
for each row
execute function public.sync_program_document_program_key();

-- =====================================================
-- 16. RLS POLICIES: USER ROLES
-- =====================================================

drop policy if exists "Users can view own roles" on public.user_roles;

create policy "Users can view own roles"
on public.user_roles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_super_admin()
);

drop policy if exists "Super admin can manage roles" on public.user_roles;

create policy "Super admin can manage roles"
on public.user_roles
for all
to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

-- =====================================================
-- 17. RLS POLICIES: PROGRAM ADMIN ASSIGNMENTS
-- =====================================================

drop policy if exists "Admins can view relevant assignments"
on public.program_admin_assignments;

create policy "Admins can view relevant assignments"
on public.program_admin_assignments
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_super_admin()
);

drop policy if exists "Super admin can manage assignments"
on public.program_admin_assignments;

create policy "Super admin can manage assignments"
on public.program_admin_assignments
for all
to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());

-- =====================================================
-- 18. RLS POLICIES: PROGRAM APPLICATIONS
-- =====================================================

drop policy if exists "Users can insert own program applications"
on public.program_applications;

create policy "Users can insert own program applications"
on public.program_applications
for insert
to authenticated
with check (
  applicant_user_id = auth.uid()
);

drop policy if exists "Users and program admins can view applications"
on public.program_applications;

create policy "Users and program admins can view applications"
on public.program_applications
for select
to authenticated
using (
  applicant_user_id = auth.uid()
  or public.current_user_can_view_program(program_key, district, taluka)
);

drop policy if exists "Users and program admins can update applications"
on public.program_applications;

create policy "Users and program admins can update applications"
on public.program_applications
for update
to authenticated
using (
  (
    applicant_user_id = auth.uid()
    and status in ('submitted', 'need_more_info')
  )
  or public.current_user_can_review_program(program_key, district, taluka)
)
with check (
  (
    applicant_user_id = auth.uid()
    and status in ('submitted', 'need_more_info')
  )
  or public.current_user_can_review_program(program_key, district, taluka)
);

drop policy if exists "Super admin can delete applications"
on public.program_applications;

create policy "Super admin can delete applications"
on public.program_applications
for delete
to authenticated
using (
  public.current_user_is_super_admin()
);

-- =====================================================
-- 19. RLS POLICIES: PROGRAM DOCUMENTS
-- =====================================================

drop policy if exists "Users and program admins can view documents"
on public.program_documents;

create policy "Users and program admins can view documents"
on public.program_documents
for select
to authenticated
using (
  uploaded_by = auth.uid()
  or exists (
    select 1
    from public.program_applications pa
    where pa.id = program_documents.application_id
      and (
        pa.applicant_user_id = auth.uid()
        or public.current_user_can_view_program(pa.program_key, pa.district, pa.taluka)
      )
  )
);

drop policy if exists "Users can upload own documents"
on public.program_documents;

create policy "Users can upload own documents"
on public.program_documents
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.program_applications pa
    where pa.id = program_documents.application_id
      and pa.applicant_user_id = auth.uid()
  )
);

drop policy if exists "Program admins can update documents"
on public.program_documents;

create policy "Program admins can update documents"
on public.program_documents
for update
to authenticated
using (
  exists (
    select 1
    from public.program_applications pa
    where pa.id = program_documents.application_id
      and public.current_user_can_review_program(pa.program_key, pa.district, pa.taluka)
  )
)
with check (
  exists (
    select 1
    from public.program_applications pa
    where pa.id = program_documents.application_id
      and public.current_user_can_review_program(pa.program_key, pa.district, pa.taluka)
  )
);

drop policy if exists "Super admin can delete documents"
on public.program_documents;

create policy "Super admin can delete documents"
on public.program_documents
for delete
to authenticated
using (
  public.current_user_is_super_admin()
);

-- =====================================================
-- 20. STORAGE BUCKET
-- =====================================================

insert into storage.buckets (id, name, public)
values ('program-documents', 'program-documents', false)
on conflict (id) do nothing;

-- User upload rule:
-- file path must start with auth user id:
-- {user_id}/{application_id}/{document_type}-{timestamp}.pdf
drop policy if exists "Users upload own program documents"
on storage.objects;

create policy "Users upload own program documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'program-documents'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Users and program admins view program documents"
on storage.objects;

create policy "Users and program admins view program documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'program-documents'
  and (
    auth.uid()::text = split_part(name, '/', 1)
    or public.current_user_is_super_admin()
    or exists (
      select 1
      from public.program_documents pd
      join public.program_applications pa
        on pa.id = pd.application_id
      where pd.file_path = storage.objects.name
        and public.current_user_can_view_program(
          pa.program_key,
          pa.district,
          pa.taluka
        )
    )
  )
);

drop policy if exists "Users update own program documents"
on storage.objects;

create policy "Users update own program documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'program-documents'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'program-documents'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Users delete own program documents"
on storage.objects;

create policy "Users delete own program documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'program-documents'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- =====================================================
-- 21. FUNCTION GRANTS
-- Tighten SECURITY DEFINER and helper function permissions.
-- =====================================================

revoke all on function public.set_updated_at() from public, anon;
revoke all on function public.current_user_has_role(text) from public, anon;
revoke all on function public.current_user_is_super_admin() from public, anon;
revoke all on function public.current_user_can_view_program(public.program_key, text, text) from public, anon;
revoke all on function public.current_user_can_review_program(public.program_key, text, text) from public, anon;
revoke all on function public.current_user_can_approve_program(public.program_key, text, text) from public, anon;
revoke all on function public.current_user_can_mark_completed_program(public.program_key, text, text) from public, anon;
revoke all on function public.current_user_can_manage_program(public.program_key, text, text) from public, anon;
revoke all on function public.verify_membership_no(text) from public, anon;
revoke all on function public.set_program_application_no() from public, anon;
revoke all on function public.link_program_application_member() from public, anon;
revoke all on function public.enforce_program_application_update_permissions() from public, anon;
revoke all on function public.sync_program_document_program_key() from public, anon;

grant execute on function public.current_user_has_role(text) to authenticated;
grant execute on function public.current_user_is_super_admin() to authenticated;
grant execute on function public.current_user_can_view_program(public.program_key, text, text) to authenticated;
grant execute on function public.current_user_can_review_program(public.program_key, text, text) to authenticated;
grant execute on function public.current_user_can_approve_program(public.program_key, text, text) to authenticated;
grant execute on function public.current_user_can_mark_completed_program(public.program_key, text, text) to authenticated;
grant execute on function public.current_user_can_manage_program(public.program_key, text, text) to authenticated;
grant execute on function public.verify_membership_no(text) to authenticated;

-- Trigger functions do not need direct authenticated execute grants.

-- =====================================================
-- 22. OPTIONAL COMMENTS
-- =====================================================

comment on table public.program_applications is
'Generic JAS program application table for education, health, employment, ration and welfare modules.';

comment on table public.program_documents is
'Metadata for program documents stored in Supabase Storage bucket program-documents.';

comment on table public.program_admin_assignments is
'Program-specific and district/taluka-specific admin permission assignments.';

comment on function public.verify_membership_no(text) is
'Verifies that a JAS membership number exists and belongs to an approved member.';

-- =====================================================
-- END MIGRATION
-- =====================================================
