-- Area-based Permissions Phase 1
-- Adds district/taluka access assignments for admin users.
-- Phase 1 focuses on safe management + helper functions. Module-level filtering can use get_my_area_permissions().

create table if not exists public.admin_area_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null check (
    module_key in (
      'all',
      'membership',
      'education',
      'health',
      'welfare',
      'employment',
      'finance',
      'reports'
    )
  ),
  scope text not null check (scope in ('all', 'district', 'taluka')),
  district text,
  taluka text,
  can_view boolean not null default true,
  can_review boolean not null default false,
  can_approve boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep the scope/district/taluka rule idempotent.
-- CREATE/ALTER CONSTRAINT does not support IF NOT EXISTS, so use pg_constraint check.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_area_permissions_scope_check'
      and conrelid = 'public.admin_area_permissions'::regclass
  ) then
    alter table public.admin_area_permissions
    add constraint admin_area_permissions_scope_check
    check (
      (scope = 'all' and district is null and taluka is null)
      or (scope = 'district' and district is not null and taluka is null)
      or (scope = 'taluka' and district is not null and taluka is not null)
    );
  end if;
end
$$;

create unique index if not exists admin_area_permissions_unique_active
on public.admin_area_permissions (
  user_id,
  module_key,
  scope,
  coalesce(district, ''),
  coalesce(taluka, '')
)
where is_active = true;

create index if not exists admin_area_permissions_user_idx
on public.admin_area_permissions (user_id, is_active, module_key);

create index if not exists admin_area_permissions_area_idx
on public.admin_area_permissions (module_key, scope, district, taluka)
where is_active = true;

create or replace function public.touch_admin_area_permissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_touch_admin_area_permissions_updated_at on public.admin_area_permissions;
create trigger trg_touch_admin_area_permissions_updated_at
before update on public.admin_area_permissions
for each row execute function public.touch_admin_area_permissions_updated_at();

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
  select public.current_user_has_role('super_admin');
$$;

create or replace function public.current_user_is_admin_or_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_role('super_admin') or public.current_user_has_role('admin');
$$;

alter table public.admin_area_permissions enable row level security;

drop policy if exists "Super admins can manage admin area permissions"
on public.admin_area_permissions;

create policy "Super admins can manage admin area permissions"
on public.admin_area_permissions
for all
to authenticated
using (public.current_user_is_super_admin())
with check (public.current_user_is_super_admin());


drop policy if exists "Admins can read own area permissions"
on public.admin_area_permissions;

create policy "Admins can read own area permissions"
on public.admin_area_permissions
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.search_users_for_area_permissions(
  _query text default '',
  _limit int default 20
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
begin
  if not public.current_user_is_super_admin() then
    raise exception 'Only super admin can search users for area permissions.';
  end if;

  return query
  with matched_users as (
    select distinct u.id, u.email
    from auth.users u
    left join public.members m on m.user_id = u.id
    where coalesce(_query, '') = ''
       or u.email ilike '%' || _query || '%'
       or u.id::text ilike '%' || _query || '%'
       or m.full_name ilike '%' || _query || '%'
       or m.father_name ilike '%' || _query || '%'
       or m.member_no ilike '%' || _query || '%'
    order by u.email nulls last
    limit greatest(1, least(coalesce(_limit, 20), 50))
  )
  select
    mu.id as user_id,
    mu.email::text as email,
    coalesce(array_agg(distinct ur.role::text) filter (where ur.role is not null), array[]::text[]) as roles,
    max(m.id) as member_id,
    max(m.member_no)::text as member_no,
    max(m.full_name)::text as full_name,
    max(m.father_name)::text as father_name,
    max(m.district)::text as district,
    max(m.taluka)::text as taluka,
    count(distinct aap.id) filter (where aap.is_active = true) as active_permissions_count
  from matched_users mu
  left join public.user_roles ur on ur.user_id = mu.id
  left join public.members m on m.user_id = mu.id
  left join public.admin_area_permissions aap on aap.user_id = mu.id
  group by mu.id, mu.email
  order by mu.email nulls last;
end;
$$;

create or replace function public.get_area_permissions_for_user(_user_id uuid)
returns setof public.admin_area_permissions
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_super_admin() and auth.uid() <> _user_id then
    raise exception 'You are not allowed to view these area permissions.';
  end if;

  return query
  select *
  from public.admin_area_permissions
  where user_id = _user_id
  order by is_active desc, module_key, scope, district nulls first, taluka nulls first, created_at desc;
end;
$$;

create or replace function public.get_my_area_permissions()
returns setof public.admin_area_permissions
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.admin_area_permissions
  where user_id = auth.uid()
    and is_active = true
  order by module_key, scope, district nulls first, taluka nulls first;
$$;

create or replace function public.upsert_admin_area_permission(
  _permission_id uuid,
  _user_id uuid,
  _module_key text,
  _scope text,
  _district text,
  _taluka text,
  _can_view boolean,
  _can_review boolean,
  _can_approve boolean,
  _is_active boolean,
  _notes text
)
returns public.admin_area_permissions
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.admin_area_permissions;
begin
  if not public.current_user_is_super_admin() then
    raise exception 'Only super admin can manage area permissions.';
  end if;

  if _scope = 'all' then
    _district := null;
    _taluka := null;
  elsif _scope = 'district' then
    _taluka := null;
  end if;

  if _permission_id is null then
    insert into public.admin_area_permissions (
      user_id,
      module_key,
      scope,
      district,
      taluka,
      can_view,
      can_review,
      can_approve,
      is_active,
      notes,
      created_by,
      updated_by
    ) values (
      _user_id,
      _module_key,
      _scope,
      nullif(trim(coalesce(_district, '')), ''),
      nullif(trim(coalesce(_taluka, '')), ''),
      coalesce(_can_view, true),
      coalesce(_can_review, false),
      coalesce(_can_approve, false),
      coalesce(_is_active, true),
      nullif(trim(coalesce(_notes, '')), ''),
      auth.uid(),
      auth.uid()
    )
    returning * into saved;
  else
    update public.admin_area_permissions
    set
      user_id = _user_id,
      module_key = _module_key,
      scope = _scope,
      district = nullif(trim(coalesce(_district, '')), ''),
      taluka = nullif(trim(coalesce(_taluka, '')), ''),
      can_view = coalesce(_can_view, true),
      can_review = coalesce(_can_review, false),
      can_approve = coalesce(_can_approve, false),
      is_active = coalesce(_is_active, true),
      notes = nullif(trim(coalesce(_notes, '')), ''),
      updated_by = auth.uid()
    where id = _permission_id
    returning * into saved;

    if saved.id is null then
      raise exception 'Area permission record not found.';
    end if;
  end if;

  return saved;
end;
$$;

create or replace function public.delete_admin_area_permission(_permission_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_super_admin() then
    raise exception 'Only super admin can remove area permissions.';
  end if;

  delete from public.admin_area_permissions
  where id = _permission_id;

  return found;
end;
$$;

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
set search_path = public
as $$
  select
    public.current_user_has_role('super_admin')
    or public.current_user_has_role('admin')
    or exists (
      select 1
      from public.admin_area_permissions p
      where p.user_id = auth.uid()
        and p.is_active = true
        and (p.module_key = 'all' or p.module_key = _module_key)
        and (
          (_action = 'view' and p.can_view)
          or (_action = 'review' and p.can_review)
          or (_action = 'approve' and p.can_approve)
        )
        and (
          p.scope = 'all'
          or (p.scope = 'district' and p.district = _district)
          or (p.scope = 'taluka' and p.district = _district and p.taluka = _taluka)
        )
    );
$$;
