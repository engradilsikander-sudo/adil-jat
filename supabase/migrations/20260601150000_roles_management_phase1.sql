-- 20260601150000_roles_management_phase1.sql
-- Roles Management UI Phase 1
-- Super-admin-only RPC helpers for listing users and assigning/removing roles.

create unique index if not exists user_roles_user_id_role_unique
on public.user_roles (user_id, role);

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
      and ur.role = 'super_admin'
  );
$$;

revoke all on function public.current_user_is_super_admin() from public, anon;
grant execute on function public.current_user_is_super_admin() to authenticated;

create or replace function public.role_management_search_users(_query text default '')
returns table (
  user_id uuid,
  email text,
  auth_created_at timestamptz,
  member_full_name text,
  member_no text,
  member_status text,
  roles text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_query text := lower(trim(coalesce(_query, '')));
begin
  if not public.current_user_is_super_admin() then
    raise exception 'Only super admin can search users for role management.';
  end if;

  return query
  select
    au.id as user_id,
    au.email::text as email,
    au.created_at as auth_created_at,
    latest_member.full_name::text as member_full_name,
    latest_member.member_no::text as member_no,
    latest_member.status::text as member_status,
    coalesce(
      array_agg(distinct ur.role::text order by ur.role::text)
        filter (where ur.role is not null),
      array[]::text[]
    ) as roles
  from auth.users au
  left join lateral (
    select m.full_name, m.member_no, m.status
    from public.members m
    where m.user_id = au.id
    order by m.created_at desc
    limit 1
  ) latest_member on true
  left join public.user_roles ur on ur.user_id = au.id
  where
    safe_query = ''
    or lower(coalesce(au.email::text, '')) like '%' || safe_query || '%'
    or lower(au.id::text) like '%' || safe_query || '%'
    or lower(coalesce(latest_member.full_name::text, '')) like '%' || safe_query || '%'
    or lower(coalesce(latest_member.member_no::text, '')) like '%' || safe_query || '%'
  group by
    au.id,
    au.email,
    au.created_at,
    latest_member.full_name,
    latest_member.member_no,
    latest_member.status
  order by au.created_at desc
  limit 50;
end;
$$;

revoke all on function public.role_management_search_users(text) from public, anon;
grant execute on function public.role_management_search_users(text) to authenticated;

create or replace function public.role_management_assign_role(
  _target_user_id uuid,
  _role public.app_role
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_super_admin() then
    raise exception 'Only super admin can assign roles.';
  end if;

  if _target_user_id is null then
    raise exception 'Target user is required.';
  end if;

  if not exists (select 1 from auth.users au where au.id = _target_user_id) then
    raise exception 'Target user not found.';
  end if;

  insert into public.user_roles (user_id, role)
  values (_target_user_id, _role)
  on conflict (user_id, role) do nothing;
end;
$$;

revoke all on function public.role_management_assign_role(uuid, public.app_role) from public, anon;
grant execute on function public.role_management_assign_role(uuid, public.app_role) to authenticated;

create or replace function public.role_management_remove_role(
  _target_user_id uuid,
  _role public.app_role
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  super_admin_count integer;
begin
  if not public.current_user_is_super_admin() then
    raise exception 'Only super admin can remove roles.';
  end if;

  if _target_user_id is null then
    raise exception 'Target user is required.';
  end if;

  if _role = 'super_admin' and _target_user_id = auth.uid() then
    raise exception 'You cannot remove your own super admin role.';
  end if;

  if _role = 'super_admin' then
    select count(*)
    into super_admin_count
    from public.user_roles
    where role = 'super_admin';

    if super_admin_count <= 1 then
      raise exception 'At least one super admin must remain.';
    end if;
  end if;

  delete from public.user_roles
  where user_id = _target_user_id
    and role = _role;
end;
$$;

revoke all on function public.role_management_remove_role(uuid, public.app_role) from public, anon;
grant execute on function public.role_management_remove_role(uuid, public.app_role) to authenticated;
