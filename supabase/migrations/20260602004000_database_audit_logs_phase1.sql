-- Database Audit Logs Phase 1
-- Adds guaranteed trigger-based audit logging for sensitive admin data changes.
-- Safe to run on local and cloud Supabase projects.

create extension if not exists pgcrypto;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid null references auth.users(id) on delete set null,
  actor_email text null,
  action text not null check (action in ('insert', 'update', 'delete')),
  action_label text not null,
  module_key text not null default 'system',
  entity_schema text not null default 'public',
  entity_table text not null,
  entity_id uuid null,
  record_label text null,
  old_data jsonb null,
  new_data jsonb null,
  changed_data jsonb null,
  request_id text null,
  ip_address text null,
  user_agent text null
);

alter table public.audit_logs
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists actor_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists actor_email text null,
  add column if not exists action text not null default 'update',
  add column if not exists action_label text not null default 'Record updated',
  add column if not exists module_key text not null default 'system',
  add column if not exists entity_schema text not null default 'public',
  add column if not exists entity_table text not null default 'unknown',
  add column if not exists entity_id uuid null,
  add column if not exists record_label text null,
  add column if not exists old_data jsonb null,
  add column if not exists new_data jsonb null,
  add column if not exists changed_data jsonb null,
  add column if not exists request_id text null,
  add column if not exists ip_address text null,
  add column if not exists user_agent text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_action_check'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_action_check
      check (action in ('insert', 'update', 'delete'));
  end if;
end
$$;

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_actor_user_id_idx
  on public.audit_logs (actor_user_id);

create index if not exists audit_logs_module_key_created_at_idx
  on public.audit_logs (module_key, created_at desc);

create index if not exists audit_logs_entity_table_created_at_idx
  on public.audit_logs (entity_table, created_at desc);

create index if not exists audit_logs_entity_id_idx
  on public.audit_logs (entity_id)
  where entity_id is not null;

create or replace function public.current_user_can_view_audit_logs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role::text = 'super_admin'
  );
$$;

revoke all on function public.current_user_can_view_audit_logs() from public, anon;
grant execute on function public.current_user_can_view_audit_logs() to authenticated;

create or replace function public.audit_redact_jsonb(_data jsonb)
returns jsonb
language sql
stable
as $$
  select case
    when _data is null then null
    else coalesce(
      (
        select jsonb_object_agg(
          e.key,
          case
            when lower(e.key) similar to '%(password|secret|token|service_role|refresh_token|access_token|otp|session)%'
              then to_jsonb('[redacted]'::text)
            when lower(e.key) similar to '%(cnic|mobile|phone|emergency_contact_mobile)%'
              then to_jsonb('[protected]'::text)
            else e.value
          end
        )
        from jsonb_each(_data) e
      ),
      '{}'::jsonb
    )
  end;
$$;

create or replace function public.audit_jsonb_diff(_old jsonb, _new jsonb)
returns jsonb
language sql
stable
as $$
  select coalesce(
    jsonb_object_agg(
      n.key,
      jsonb_build_object('old', o.value, 'new', n.value)
    ),
    '{}'::jsonb
  )
  from jsonb_each(coalesce(_new, '{}'::jsonb)) n
  left join jsonb_each(coalesce(_old, '{}'::jsonb)) o using (key)
  where n.value is distinct from o.value;
$$;

create or replace function public.audit_module_for_record(
  _table_name text,
  _row_data jsonb
)
returns text
language plpgsql
stable
as $$
begin
  if _table_name in ('members', 'member_counters') then
    return 'membership';
  end if;

  if _table_name in ('user_roles') then
    return 'roles';
  end if;

  if _table_name in ('admin_area_permissions') then
    return 'area_permissions';
  end if;

  if _table_name in (
    'organization_committees',
    'organization_designations',
    'organization_committee_members'
  ) then
    return 'committees';
  end if;

  if _table_name like 'finance_%' then
    return 'finance';
  end if;

  if _table_name in ('program_applications', 'program_documents') then
    return coalesce(nullif(_row_data ->> 'program_key', ''), 'programs');
  end if;

  if _table_name in ('news_posts', 'gallery_items', 'events') then
    return 'media';
  end if;

  if _table_name in ('cms_pages') then
    return 'cms';
  end if;

  return 'system';
end;
$$;

create or replace function public.audit_record_label(
  _table_name text,
  _row_data jsonb
)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(_row_data ->> 'member_no', ''),
    nullif(_row_data ->> 'application_no', ''),
    nullif(_row_data ->> 'donation_no', ''),
    nullif(_row_data ->> 'expense_no', ''),
    nullif(_row_data ->> 'receipt_no', ''),
    nullif(_row_data ->> 'title', ''),
    nullif(_row_data ->> 'name', ''),
    nullif(_row_data ->> 'full_name', ''),
    nullif(_row_data ->> 'applicant_name', ''),
    nullif(_row_data ->> 'patient_name', ''),
    nullif(_row_data ->> 'student_name', ''),
    nullif(_row_data ->> 'committee_name', ''),
    nullif(_row_data ->> 'designation_title', ''),
    nullif(_row_data ->> 'id', '')
  );
$$;

create or replace function public.audit_action_label(
  _table_name text,
  _action text,
  _row_data jsonb
)
returns text
language plpgsql
stable
as $$
begin
  if _table_name = 'user_roles' then
    if _action = 'insert' then return 'Role assigned'; end if;
    if _action = 'delete' then return 'Role removed'; end if;
    return 'Role updated';
  end if;

  if _table_name = 'admin_area_permissions' then
    if _action = 'insert' then return 'Area permission granted'; end if;
    if _action = 'delete' then return 'Area permission removed'; end if;
    return 'Area permission updated';
  end if;

  if _table_name = 'members' then
    if _action = 'update' and (_row_data ->> 'status') = 'approved' then
      return 'Member approved or updated';
    end if;
    if _action = 'update' and (_row_data ->> 'status') = 'rejected' then
      return 'Member rejected or updated';
    end if;
    if _action = 'insert' then return 'Membership application created'; end if;
    return 'Membership record updated';
  end if;

  if _table_name = 'organization_committee_members' then
    if _action = 'insert' then return 'Office bearer assigned'; end if;
    if _action = 'delete' then return 'Office bearer removed'; end if;
    return 'Office bearer assignment updated';
  end if;

  if _table_name in ('organization_committees', 'organization_designations') then
    if _action = 'insert' then return 'Committee setup record created'; end if;
    if _action = 'delete' then return 'Committee setup record removed'; end if;
    return 'Committee setup record updated';
  end if;

  if _table_name like 'finance_%' then
    if _action = 'insert' then return 'Finance record created'; end if;
    if _action = 'delete' then return 'Finance record removed'; end if;
    return 'Finance record updated';
  end if;

  if _table_name in ('program_applications', 'program_documents') then
    if _action = 'insert' then return 'Program record created'; end if;
    if _action = 'delete' then return 'Program record removed'; end if;
    return 'Program record updated';
  end if;

  if _table_name in ('news_posts', 'gallery_items', 'events', 'cms_pages') then
    if _action = 'insert' then return 'Public content created'; end if;
    if _action = 'delete' then return 'Public content removed'; end if;
    return 'Public content updated';
  end if;

  if _action = 'insert' then return 'Record created'; end if;
  if _action = 'delete' then return 'Record removed'; end if;
  return 'Record updated';
end;
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_old jsonb := null;
  v_new jsonb := null;
  v_row jsonb := null;
  v_entity_id uuid := null;
  v_actor_user_id uuid := null;
  v_actor_email text := null;
  v_action text := lower(TG_OP);
  v_request_id text := null;
  v_ip_address text := null;
  v_user_agent text := null;
  v_changed jsonb := null;
begin
  if TG_TABLE_SCHEMA <> 'public' then
    if TG_OP = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if TG_TABLE_NAME = 'audit_logs' then
    if TG_OP = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if TG_OP = 'INSERT' then
    v_new := to_jsonb(new);
    v_row := v_new;
  elsif TG_OP = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row := v_new;

    if v_old = v_new then
      return new;
    end if;
  elsif TG_OP = 'DELETE' then
    v_old := to_jsonb(old);
    v_row := v_old;
  end if;

  begin
    v_entity_id := nullif(coalesce(v_new ->> 'id', v_old ->> 'id'), '')::uuid;
  exception when others then
    v_entity_id := null;
  end;

  v_actor_user_id := (select auth.uid());

  if v_actor_user_id is null then
    begin
      v_actor_user_id := nullif(
        coalesce(
          v_new ->> 'reviewed_by',
          v_new ->> 'approved_by',
          v_new ->> 'updated_by',
          v_new ->> 'created_by',
          v_old ->> 'reviewed_by',
          v_old ->> 'approved_by',
          v_old ->> 'updated_by',
          v_old ->> 'created_by'
        ),
        ''
      )::uuid;
    exception when others then
      v_actor_user_id := null;
    end;
  end if;

  begin
    v_actor_email := coalesce(
      auth.jwt() ->> 'email',
      current_setting('request.jwt.claim.email', true),
      (
        select u.email::text
        from auth.users u
        where u.id = v_actor_user_id
        limit 1
      )
    );
  exception when others then
    v_actor_email := null;
  end;

  v_request_id := current_setting('request.headers.x-request-id', true);
  v_ip_address := coalesce(
    current_setting('request.headers.x-forwarded-for', true),
    current_setting('request.headers.cf-connecting-ip', true),
    current_setting('request.headers.x-real-ip', true)
  );
  v_user_agent := current_setting('request.headers.user-agent', true);

  if TG_OP = 'UPDATE' then
    v_changed := public.audit_jsonb_diff(v_old, v_new);
  elsif TG_OP = 'INSERT' then
    v_changed := public.audit_redact_jsonb(v_new);
  elsif TG_OP = 'DELETE' then
    v_changed := public.audit_redact_jsonb(v_old);
  end if;

  insert into public.audit_logs (
    actor_user_id,
    actor_email,
    action,
    action_label,
    module_key,
    entity_schema,
    entity_table,
    entity_id,
    record_label,
    old_data,
    new_data,
    changed_data,
    request_id,
    ip_address,
    user_agent
  ) values (
    v_actor_user_id,
    v_actor_email,
    v_action,
    public.audit_action_label(TG_TABLE_NAME, v_action, v_row),
    public.audit_module_for_record(TG_TABLE_NAME, v_row),
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME,
    v_entity_id,
    public.audit_record_label(TG_TABLE_NAME, v_row),
    public.audit_redact_jsonb(v_old),
    public.audit_redact_jsonb(v_new),
    public.audit_redact_jsonb(v_changed),
    nullif(v_request_id, ''),
    nullif(v_ip_address, ''),
    nullif(v_user_agent, '')
  );

  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function public.write_audit_log() from public, anon, authenticated;

do $$
declare
  table_name text;
  audited_tables text[] := array[
    'public.user_roles',
    'public.admin_area_permissions',
    'public.members',
    'public.program_applications',
    'public.program_documents',
    'public.finance_donations',
    'public.finance_expenses',
    'public.finance_audit_logs',
    'public.organization_committees',
    'public.organization_designations',
    'public.organization_committee_members',
    'public.cms_pages',
    'public.news_posts',
    'public.gallery_items',
    'public.events'
  ];
begin
  foreach table_name in array audited_tables loop
    if to_regclass(table_name) is not null then
      execute format('drop trigger if exists audit_log_changes on %s', table_name);
      execute format(
        'create trigger audit_log_changes after insert or update or delete on %s for each row execute function public.write_audit_log()',
        table_name
      );
    end if;
  end loop;
end
$$;

create or replace function public.get_audit_logs(
  _module_key text default null,
  _entity_table text default null,
  _actor_user_id uuid default null,
  _query text default '',
  _limit integer default 100
)
returns table (
  id uuid,
  created_at timestamptz,
  actor_user_id uuid,
  actor_email text,
  action text,
  action_label text,
  module_key text,
  entity_table text,
  entity_id uuid,
  record_label text,
  changed_data jsonb,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  search_text text := trim(coalesce(_query, ''));
  safe_limit integer := greatest(1, least(coalesce(_limit, 100), 300));
begin
  if not public.current_user_can_view_audit_logs() then
    raise exception 'Only super admin can view audit logs.' using errcode = '42501';
  end if;

  return query
  select
    al.id,
    al.created_at,
    al.actor_user_id,
    coalesce(al.actor_email, au.email::text) as actor_email,
    al.action,
    al.action_label,
    al.module_key,
    al.entity_table,
    al.entity_id,
    al.record_label,
    al.changed_data,
    al.old_data,
    al.new_data,
    al.ip_address,
    al.user_agent
  from public.audit_logs al
  left join auth.users au on au.id = al.actor_user_id
  where (_module_key is null or _module_key = '' or al.module_key = _module_key)
    and (_entity_table is null or _entity_table = '' or al.entity_table = _entity_table)
    and (_actor_user_id is null or al.actor_user_id = _actor_user_id)
    and (
      search_text = ''
      or al.action_label ilike '%' || search_text || '%'
      or al.module_key ilike '%' || search_text || '%'
      or al.entity_table ilike '%' || search_text || '%'
      or al.record_label ilike '%' || search_text || '%'
      or al.actor_email ilike '%' || search_text || '%'
      or au.email ilike '%' || search_text || '%'
      or al.entity_id::text ilike '%' || search_text || '%'
    )
  order by al.created_at desc
  limit safe_limit;
end;
$$;

revoke all on function public.get_audit_logs(text, text, uuid, text, integer) from public, anon;
grant execute on function public.get_audit_logs(text, text, uuid, text, integer) to authenticated;

alter table public.audit_logs enable row level security;

alter table public.audit_logs force row level security;

drop policy if exists "Super admins can read audit logs" on public.audit_logs;
create policy "Super admins can read audit logs"
on public.audit_logs
for select
to authenticated
using (public.current_user_can_view_audit_logs());

drop policy if exists "No client insert audit logs" on public.audit_logs;
create policy "No client insert audit logs"
on public.audit_logs
for insert
to authenticated
with check (false);

drop policy if exists "No client update audit logs" on public.audit_logs;
create policy "No client update audit logs"
on public.audit_logs
for update
to authenticated
using (false)
with check (false);

drop policy if exists "No client delete audit logs" on public.audit_logs;
create policy "No client delete audit logs"
on public.audit_logs
for delete
to authenticated
using (false);
