-- Database Area RLS Enforcement Phase 3
-- Pushes district/taluka/module scoping into database policies.
-- Source of truth:
--   user_roles = identity/global role
--   admin_area_permissions = module + area + action scope
--   program_admin_assignments = legacy compatibility only
--
-- Important behavior change:
--   super_admin/admin keep All Sindh access.
--   module admins such as membership_admin, education_admin, health_admin,
--   welfare_admin, employment_admin and finance_admin need matching
--   admin_area_permissions rows to access scoped data.

create schema if not exists app_private;

-- -----------------------------------------------------------------------------
-- 1) Private role/area helpers
-- -----------------------------------------------------------------------------

create or replace function app_private.user_has_app_role(
  _user_id uuid,
  _role text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role::text = _role
  );
$$;

revoke all on function app_private.user_has_app_role(uuid, text) from public, anon;
grant execute on function app_private.user_has_app_role(uuid, text) to authenticated, service_role;

create or replace function app_private.user_has_any_app_role(
  _user_id uuid,
  _roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role::text = any(_roles)
  );
$$;

revoke all on function app_private.user_has_any_app_role(uuid, text[]) from public, anon;
grant execute on function app_private.user_has_any_app_role(uuid, text[]) to authenticated, service_role;

-- Row-aware area checker for a specific user.
-- If district/taluka are both null, this behaves like a module-level access check
-- and returns true when the user has any active permission for that module/action.
create or replace function app_private.user_can_access_area_module(
  _user_id uuid,
  _module_key text,
  _district text default null,
  _taluka text default null,
  _action text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    app_private.user_has_any_app_role(_user_id, array['super_admin', 'admin'])
    or exists (
      select 1
      from public.admin_area_permissions p
      where p.user_id = _user_id
        and p.is_active = true
        and (p.module_key = 'all' or p.module_key = _module_key)
        and (
          (_action = 'view' and p.can_view)
          or (_action = 'review' and p.can_review)
          or (_action = 'approve' and p.can_approve)
        )
        and (
          (_district is null and _taluka is null)
          or p.scope = 'all'
          or (
            p.scope = 'district'
            and _district is not null
            and lower(trim(p.district)) = lower(trim(_district))
          )
          or (
            p.scope = 'taluka'
            and _district is not null
            and _taluka is not null
            and lower(trim(p.district)) = lower(trim(_district))
            and lower(trim(p.taluka)) = lower(trim(_taluka))
          )
        )
    );
$$;

revoke all on function app_private.user_can_access_area_module(uuid, text, text, text, text) from public, anon;
grant execute on function app_private.user_can_access_area_module(uuid, text, text, text, text) to authenticated, service_role;

-- Public wrappers used by UI/RLS. They are still protected from anon execution by
-- earlier security patches, but remain callable by signed-in users/RLS policies.
create or replace function public.current_user_can_access_area_module(
  _module_key text,
  _action text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select app_private.user_can_access_area_module(
    (select auth.uid()),
    _module_key,
    null,
    null,
    coalesce(_action, 'view')
  );
$$;

revoke all on function public.current_user_can_access_area_module(text, text) from public, anon;
grant execute on function public.current_user_can_access_area_module(text, text) to authenticated;

create or replace function public.admin_area_permission_matches(
  _module_key text,
  _district text,
  _taluka text,
  _action text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select app_private.user_can_access_area_module(
    (select auth.uid()),
    _module_key,
    _district,
    _taluka,
    coalesce(_action, 'view')
  );
$$;

revoke all on function public.admin_area_permission_matches(text, text, text, text) from public, anon;
grant execute on function public.admin_area_permission_matches(text, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 2) Membership area helpers and policies
-- -----------------------------------------------------------------------------

create or replace function public.current_user_can_manage_membership()
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select public.current_user_can_access_area_module('membership', 'view');
$$;

revoke all on function public.current_user_can_manage_membership() from public, anon;
grant execute on function public.current_user_can_manage_membership() to authenticated;

create or replace function public.current_user_can_access_membership_area(
  _district text default null,
  _taluka text default null,
  _action text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select app_private.user_can_access_area_module(
    (select auth.uid()),
    'membership',
    _district,
    _taluka,
    coalesce(_action, 'view')
  );
$$;

revoke all on function public.current_user_can_access_membership_area(text, text, text) from public, anon;
grant execute on function public.current_user_can_access_membership_area(text, text, text) to authenticated;

-- Keep self-service policies but make reviewer access area-aware.
drop policy if exists "members_select_own_or_admin" on public.members;
drop policy if exists "members_admin_select_update_all" on public.members;

drop policy if exists "members_select_own_or_membership_area_admin" on public.members;
create policy "members_select_own_or_membership_area_admin"
on public.members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.current_user_can_access_membership_area(district, taluka, 'view')
);

drop policy if exists "members_update_own_or_membership_area_admin" on public.members;
create policy "members_update_own_or_membership_area_admin"
on public.members
for update
to authenticated
using (
  (
    user_id = (select auth.uid())
    and status in ('pending', 'rejected')
  )
  or public.current_user_can_access_membership_area(district, taluka, 'review')
)
with check (
  (
    user_id = (select auth.uid())
    and status = 'pending'
    and member_no is null
    and rejection_reason is null
    and approved_at is null
  )
  or public.current_user_can_access_membership_area(district, taluka, 'review')
);

-- Counter visibility stays limited to people who can manage membership somewhere.
drop policy if exists "member_counters_admin_select" on public.member_counters;
create policy "member_counters_admin_select"
on public.member_counters
for select
to authenticated
using (public.current_user_can_manage_membership());

-- Member photos: reviewers can read/update/delete only for members in their area.
drop policy if exists "member_photos_select_own_or_admin" on storage.objects;
create policy "member_photos_select_own_or_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.members m
      where m.user_id::text = (storage.foldername(storage.objects.name))[1]
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'view')
    )
  )
);

drop policy if exists "member_photos_update_own_or_admin" on storage.objects;
create policy "member_photos_update_own_or_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.members m
      where m.user_id::text = (storage.foldername(storage.objects.name))[1]
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
    )
  )
)
with check (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.members m
      where m.user_id::text = (storage.foldername(storage.objects.name))[1]
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
    )
  )
);

drop policy if exists "member_photos_delete_own_or_admin" on storage.objects;
create policy "member_photos_delete_own_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.members m
      where m.user_id::text = (storage.foldername(storage.objects.name))[1]
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
    )
  )
);

-- Service-role membership RPCs now validate the reviewer against the target member area.
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
  pending_member public.members;
  approved_member public.members;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only service role can approve members.';
  end if;

  select *
  into pending_member
  from public.members
  where id = _member_id
    and status = 'pending';

  if pending_member.id is null then
    raise exception 'Pending member application not found.';
  end if;

  if _reviewed_by is not null
    and not app_private.user_can_access_area_module(
      _reviewed_by,
      'membership',
      pending_member.district,
      pending_member.taluka,
      'approve'
    )
  then
    raise exception 'Reviewer does not have membership approval access for this area.';
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
  pending_member public.members;
  rejected_member public.members;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only service role can reject members.';
  end if;

  if _rejection_reason is null or length(trim(_rejection_reason)) < 3 then
    raise exception 'Rejection reason is required.';
  end if;

  select *
  into pending_member
  from public.members
  where id = _member_id
    and status = 'pending';

  if pending_member.id is null then
    raise exception 'Pending member application not found.';
  end if;

  if _reviewed_by is not null
    and not app_private.user_can_access_area_module(
      _reviewed_by,
      'membership',
      pending_member.district,
      pending_member.taluka,
      'review'
    )
  then
    raise exception 'Reviewer does not have membership review access for this area.';
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

  return rejected_member;
end;
$$;

revoke all on function public.approve_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reject_member(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.approve_member(uuid, uuid) to service_role;
grant execute on function public.reject_member(uuid, text, uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 3) Program application/document RLS helper rewrite
-- -----------------------------------------------------------------------------

create or replace function public.current_user_can_view_program(
  _program_key public.program_key,
  _district text default null,
  _taluka text default null
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select
    app_private.user_can_access_area_module(
      (select auth.uid()),
      _program_key::text,
      _district,
      _taluka,
      'view'
    )
    or exists (
      select 1
      from public.program_admin_assignments paa
      where paa.user_id = (select auth.uid())
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
set search_path = public, app_private
as $$
  select
    app_private.user_can_access_area_module(
      (select auth.uid()),
      _program_key::text,
      _district,
      _taluka,
      'review'
    )
    or exists (
      select 1
      from public.program_admin_assignments paa
      where paa.user_id = (select auth.uid())
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
set search_path = public, app_private
as $$
  select
    app_private.user_can_access_area_module(
      (select auth.uid()),
      _program_key::text,
      _district,
      _taluka,
      'approve'
    )
    or exists (
      select 1
      from public.program_admin_assignments paa
      where paa.user_id = (select auth.uid())
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
set search_path = public, app_private
as $$
  select
    app_private.user_can_access_area_module(
      (select auth.uid()),
      _program_key::text,
      _district,
      _taluka,
      'approve'
    )
    or exists (
      select 1
      from public.program_admin_assignments paa
      where paa.user_id = (select auth.uid())
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

create or replace function public.current_user_can_manage_program(
  _program_key public.program_key,
  _district text default null,
  _taluka text default null
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select public.current_user_can_view_program(_program_key, _district, _taluka);
$$;

revoke all on function public.current_user_can_view_program(public.program_key, text, text) from public, anon;
revoke all on function public.current_user_can_review_program(public.program_key, text, text) from public, anon;
revoke all on function public.current_user_can_approve_program(public.program_key, text, text) from public, anon;
revoke all on function public.current_user_can_mark_completed_program(public.program_key, text, text) from public, anon;
revoke all on function public.current_user_can_manage_program(public.program_key, text, text) from public, anon;
grant execute on function public.current_user_can_view_program(public.program_key, text, text) to authenticated;
grant execute on function public.current_user_can_review_program(public.program_key, text, text) to authenticated;
grant execute on function public.current_user_can_approve_program(public.program_key, text, text) to authenticated;
grant execute on function public.current_user_can_mark_completed_program(public.program_key, text, text) to authenticated;
grant execute on function public.current_user_can_manage_program(public.program_key, text, text) to authenticated;

-- Recreate program table policies with auth initplan-safe expressions.
drop policy if exists "Users can insert own program applications" on public.program_applications;
create policy "Users can insert own program applications"
on public.program_applications
for insert
to authenticated
with check (applicant_user_id = (select auth.uid()));

drop policy if exists "Users and program admins can view applications" on public.program_applications;
create policy "Users and program admins can view applications"
on public.program_applications
for select
to authenticated
using (
  applicant_user_id = (select auth.uid())
  or public.current_user_can_view_program(program_key, district, taluka)
);

drop policy if exists "Users and program admins can update applications" on public.program_applications;
create policy "Users and program admins can update applications"
on public.program_applications
for update
to authenticated
using (
  (
    applicant_user_id = (select auth.uid())
    and status in ('submitted', 'need_more_info')
  )
  or public.current_user_can_review_program(program_key, district, taluka)
)
with check (
  (
    applicant_user_id = (select auth.uid())
    and status in ('submitted', 'need_more_info')
  )
  or public.current_user_can_review_program(program_key, district, taluka)
);

drop policy if exists "Super admin can delete applications" on public.program_applications;
create policy "Super admin can delete applications"
on public.program_applications
for delete
to authenticated
using (app_private.user_has_any_app_role((select auth.uid()), array['super_admin', 'admin']));

-- Program documents follow the parent application's area access.
drop policy if exists "Users and program admins can view documents" on public.program_documents;
create policy "Users and program admins can view documents"
on public.program_documents
for select
to authenticated
using (
  uploaded_by = (select auth.uid())
  or exists (
    select 1
    from public.program_applications pa
    where pa.id = program_documents.application_id
      and (
        pa.applicant_user_id = (select auth.uid())
        or public.current_user_can_view_program(pa.program_key, pa.district, pa.taluka)
      )
  )
);

drop policy if exists "Users can upload own documents" on public.program_documents;
create policy "Users can upload own documents"
on public.program_documents
for insert
to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1
    from public.program_applications pa
    where pa.id = program_documents.application_id
      and pa.applicant_user_id = (select auth.uid())
  )
);

drop policy if exists "Program admins can update documents" on public.program_documents;
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

drop policy if exists "Super admin can delete documents" on public.program_documents;
create policy "Super admin can delete documents"
on public.program_documents
for delete
to authenticated
using (app_private.user_has_any_app_role((select auth.uid()), array['super_admin', 'admin']));

-- Program document storage follows the same parent application access.
drop policy if exists "Users and program admins view program documents" on storage.objects;
create policy "Users and program admins view program documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'program-documents'
  and (
    (select auth.uid())::text = split_part(name, '/', 1)
    or exists (
      select 1
      from public.program_documents pd
      join public.program_applications pa on pa.id = pd.application_id
      where pd.file_path = storage.objects.name
        and public.current_user_can_view_program(pa.program_key, pa.district, pa.taluka)
    )
  )
);

-- -----------------------------------------------------------------------------
-- 4) Finance row-level area enforcement
-- -----------------------------------------------------------------------------

create or replace function public.current_user_can_manage_finance()
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select public.current_user_can_access_area_module('finance', 'view');
$$;

revoke all on function public.current_user_can_manage_finance() from public, anon;
grant execute on function public.current_user_can_manage_finance() to authenticated;

create or replace function public.current_user_can_access_finance_area(
  _district text default null,
  _taluka text default null,
  _action text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select app_private.user_can_access_area_module(
    (select auth.uid()),
    'finance',
    _district,
    _taluka,
    coalesce(_action, 'view')
  );
$$;

revoke all on function public.current_user_can_access_finance_area(text, text, text) from public, anon;
grant execute on function public.current_user_can_access_finance_area(text, text, text) to authenticated;

drop policy if exists "Finance admins can view donations" on public.finance_donations;
create policy "Finance admins can view donations"
on public.finance_donations
for select
to authenticated
using (public.current_user_can_access_finance_area(district, taluka, 'view'));

drop policy if exists "Finance admins can insert donations" on public.finance_donations;
create policy "Finance admins can insert donations"
on public.finance_donations
for insert
to authenticated
with check (public.current_user_can_access_finance_area(district, taluka, 'review'));

drop policy if exists "Finance admins can update donations" on public.finance_donations;
create policy "Finance admins can update donations"
on public.finance_donations
for update
to authenticated
using (public.current_user_can_access_finance_area(district, taluka, 'review'))
with check (public.current_user_can_access_finance_area(district, taluka, 'review'));

drop policy if exists "Finance admins can view expenses" on public.finance_expenses;
create policy "Finance admins can view expenses"
on public.finance_expenses
for select
to authenticated
using (public.current_user_can_access_finance_area(district, taluka, 'view'));

drop policy if exists "Finance admins can insert expenses" on public.finance_expenses;
create policy "Finance admins can insert expenses"
on public.finance_expenses
for insert
to authenticated
with check (public.current_user_can_access_finance_area(district, taluka, 'review'));

drop policy if exists "Finance admins can update expenses" on public.finance_expenses;
create policy "Finance admins can update expenses"
on public.finance_expenses
for update
to authenticated
using (public.current_user_can_access_finance_area(district, taluka, 'review'))
with check (public.current_user_can_access_finance_area(district, taluka, 'review'));

create or replace function public.current_user_can_view_finance_audit_log(
  _entity_type text,
  _entity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select
    app_private.user_has_any_app_role((select auth.uid()), array['super_admin', 'admin'])
    or (
      _entity_type = 'finance_donations'
      and exists (
        select 1
        from public.finance_donations fd
        where fd.id = _entity_id
          and public.current_user_can_access_finance_area(fd.district, fd.taluka, 'view')
      )
    )
    or (
      _entity_type = 'finance_expenses'
      and exists (
        select 1
        from public.finance_expenses fe
        where fe.id = _entity_id
          and public.current_user_can_access_finance_area(fe.district, fe.taluka, 'view')
      )
    );
$$;

revoke all on function public.current_user_can_view_finance_audit_log(text, uuid) from public, anon;
grant execute on function public.current_user_can_view_finance_audit_log(text, uuid) to authenticated;

drop policy if exists "Finance admins can view audit logs" on public.finance_audit_logs;
create policy "Finance admins can view audit logs"
on public.finance_audit_logs
for select
to authenticated
using (public.current_user_can_view_finance_audit_log(entity_type, entity_id));

drop policy if exists "Finance admins can insert audit logs" on public.finance_audit_logs;
create policy "Finance admins can insert audit logs"
on public.finance_audit_logs
for insert
to authenticated
with check (public.current_user_can_manage_finance());

-- Finance document storage: row-linked reads are area-aware. Inserts remain module-level
-- because the storage object is created before/alongside the row in several UI flows.
drop policy if exists "Finance admins upload finance documents" on storage.objects;
create policy "Finance admins upload finance documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'finance-documents'
  and public.current_user_can_access_area_module('finance', 'review')
);

drop policy if exists "Finance admins view finance documents" on storage.objects;
create policy "Finance admins view finance documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'finance-documents'
  and (
    public.current_user_can_access_area_module('finance', 'view')
    or exists (
      select 1
      from public.finance_expenses fe
      where fe.document_path = storage.objects.name
        and public.current_user_can_access_finance_area(fe.district, fe.taluka, 'view')
    )
    or exists (
      select 1
      from public.finance_donations fd
      where fd.receipt_file_path = storage.objects.name
        and public.current_user_can_access_finance_area(fd.district, fd.taluka, 'view')
    )
  )
);

drop policy if exists "Finance admins update finance documents" on storage.objects;
create policy "Finance admins update finance documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'finance-documents'
  and public.current_user_can_access_area_module('finance', 'review')
)
with check (
  bucket_id = 'finance-documents'
  and public.current_user_can_access_area_module('finance', 'review')
);

comment on function app_private.user_can_access_area_module(uuid, text, text, text, text) is
'Canonical private area/module/action checker. super_admin/admin have All Sindh access. Limited admins require admin_area_permissions.';

comment on function public.admin_area_permission_matches(text, text, text, text) is
'Row-level public wrapper for RLS policies. Uses admin_area_permissions as the database source of truth for limited admin scope.';

comment on function public.current_user_can_access_membership_area(text, text, text) is
'Area-aware membership access helper. Used by members RLS and member photo storage policies.';

comment on function public.current_user_can_access_finance_area(text, text, text) is
'Area-aware finance access helper. Used by finance donation/expense/audit RLS policies.';

create or replace function public.search_users_for_area_permissions(
  _query text default '',
  _limit integer default 20
)
returns table (
  user_id uuid,
  email text,
  roles text[],
  member_id uuid,
  member_no text,
  full_name text,
  father_name text,
  district text,
  taluka text,
  active_permissions_count bigint
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  search_text text := trim(coalesce(_query, ''));
  safe_limit integer := greatest(1, least(coalesce(_limit, 20), 50));
begin
  if not public.current_user_is_super_admin() then
    raise exception 'Only super admin can search users for area permissions.'
      using errcode = '42501';
  end if;

  return query
  with matched_users as (
    select
      u.id as uid,
      u.email::text as user_email
    from auth.users u
    where search_text = ''
       or u.email ilike '%' || search_text || '%'
       or u.id::text ilike '%' || search_text || '%'
       or exists (
         select 1
         from public.members m
         where m.user_id = u.id
           and (
             m.full_name ilike '%' || search_text || '%'
             or m.father_name ilike '%' || search_text || '%'
             or m.member_no ilike '%' || search_text || '%'
             or m.mobile ilike '%' || search_text || '%'
           )
       )
    order by u.email nulls last
    limit safe_limit
  )
  select
    mu.uid as user_id,
    mu.user_email as email,

    coalesce(
      (
        select array_agg(distinct ur.role::text order by ur.role::text)
        from public.user_roles ur
        where ur.user_id = mu.uid
      ),
      array[]::text[]
    ) as roles,

    member_row.id as member_id,
    member_row.member_no::text as member_no,
    member_row.full_name::text as full_name,
    member_row.father_name::text as father_name,
    member_row.district::text as district,
    member_row.taluka::text as taluka,

    (
      select count(*)
      from public.admin_area_permissions aap
      where aap.user_id = mu.uid
        and aap.is_active = true
    ) as active_permissions_count

  from matched_users mu
  left join lateral (
    select
      m.id,
      m.member_no,
      m.full_name,
      m.father_name,
      m.district,
      m.taluka
    from public.members m
    where m.user_id = mu.uid
    order by m.created_at desc nulls last
    limit 1
  ) member_row on true
  order by mu.user_email nulls last;
end;
$$;

grant execute on function public.search_users_for_area_permissions(text, integer)
to authenticated;