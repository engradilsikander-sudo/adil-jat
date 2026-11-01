-- RBAC Source of Truth + Membership Admin Fix Phase 1
-- Makes membership review permissions consistent across SQL/RLS/server actions.
-- Source of truth:
--   user_roles = role identity
--   admin_area_permissions = area/module/action scope for limited admins
--   program_admin_assignments = legacy compatibility until fully migrated.

-- Ensure role values exist for fresh/local databases.
do $$
begin
  alter type public.app_role add value if not exists 'super_admin';
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter type public.app_role add value if not exists 'membership_admin';
exception
  when duplicate_object then null;
end
$$;

-- Private helper that avoids repeating OR chains in policies/functions.
create or replace function app_private.has_any_role(
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

revoke all on function app_private.has_any_role(uuid, text[]) from public, anon;
grant execute on function app_private.has_any_role(uuid, text[]) to authenticated, service_role;

-- Canonical public helpers.
create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select app_private.has_any_role((select auth.uid()), array['super_admin']);
$$;

revoke all on function public.current_user_is_super_admin() from public, anon;
grant execute on function public.current_user_is_super_admin() to authenticated;

create or replace function public.current_user_is_admin_or_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select app_private.has_any_role((select auth.uid()), array['admin', 'super_admin']);
$$;

revoke all on function public.current_user_is_admin_or_super_admin() from public, anon;
grant execute on function public.current_user_is_admin_or_super_admin() to authenticated;

create or replace function public.current_user_can_manage_membership()
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select app_private.has_any_role(
    (select auth.uid()),
    array['admin', 'super_admin', 'membership_admin']
  );
$$;

revoke all on function public.current_user_can_manage_membership() from public, anon;
grant execute on function public.current_user_can_manage_membership() to authenticated;

comment on function public.current_user_can_manage_membership() is
'Canonical membership-review helper. True for admin, super_admin, or membership_admin.';

-- Service-role-only membership review RPCs.
-- The browser still calls TanStack server functions, which call these RPCs with service_role.
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
    and not app_private.has_any_role(
      _reviewed_by,
      array['admin', 'super_admin', 'membership_admin']
    )
  then
    raise exception 'Reviewer must be a membership admin, admin or super admin.';
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
    and not app_private.has_any_role(
      _reviewed_by,
      array['admin', 'super_admin', 'membership_admin']
    )
  then
    raise exception 'Reviewer must be a membership admin, admin or super admin.';
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

revoke all on function public.approve_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reject_member(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.approve_member(uuid, uuid) to service_role;
grant execute on function public.reject_member(uuid, text, uuid) to service_role;

-- Members RLS: keep member self-access, add super_admin/membership_admin to admin access.
drop policy if exists "members_select_own_or_admin" on public.members;
create policy "members_select_own_or_admin"
on public.members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.current_user_can_manage_membership()
);

drop policy if exists "members_admin_select_update_all" on public.members;
create policy "members_admin_select_update_all"
on public.members
for update
to authenticated
using (public.current_user_can_manage_membership())
with check (public.current_user_can_manage_membership());

-- Optional counter read for membership managers. Counter mutations remain service-role RPC only.
drop policy if exists "member_counters_admin_select" on public.member_counters;
create policy "member_counters_admin_select"
on public.member_counters
for select
to authenticated
using (public.current_user_can_manage_membership());

-- Member photo storage access: membership managers need signed URL access for review/card previews.
drop policy if exists "member_photos_select_own_or_admin" on storage.objects;
create policy "member_photos_select_own_or_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.current_user_can_manage_membership()
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
    or public.current_user_can_manage_membership()
  )
)
with check (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.current_user_can_manage_membership()
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
    or public.current_user_can_manage_membership()
  )
);
