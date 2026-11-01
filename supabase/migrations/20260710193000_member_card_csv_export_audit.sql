-- Full member-card CSV export audit hardening.
-- Records sensitive unmasked exports without storing CNIC, mobile numbers,
-- search text, or any exported member rows.

create or replace function public.log_member_card_csv_export(
  _record_count integer,
  _filters jsonb default '{}'::jsonb,
  _area_scope text default null,
  _file_name text default null,
  _card_version text default 'v1'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_actor_email text;
  v_actor_roles text[] := array[]::text[];
  v_log_id uuid := gen_random_uuid();
  v_safe_filters jsonb;
  v_metadata jsonb;
  v_request_id text;
  v_ip_address text;
  v_user_agent text;
begin
  if v_actor_user_id is null then
    raise exception 'Authentication is required to export member card data.'
      using errcode = '42501';
  end if;

  if not public.current_user_can_manage_membership() then
    raise exception 'Membership admin access is required to export member card data.'
      using errcode = '42501';
  end if;

  if _record_count is null or _record_count < 1 or _record_count > 1000000 then
    raise exception 'Export record count is invalid.'
      using errcode = '22023';
  end if;

  select u.email::text
  into v_actor_email
  from auth.users u
  where u.id = v_actor_user_id
  limit 1;

  select coalesce(array_agg(ur.role::text order by ur.role::text), array[]::text[])
  into v_actor_roles
  from public.user_roles ur
  where ur.user_id = v_actor_user_id;

  -- Whitelist only non-sensitive filter metadata. Search text is deliberately
  -- excluded because an admin may search by full CNIC or mobile number.
  v_safe_filters := jsonb_strip_nulls(
    jsonb_build_object(
      'status', nullif(left(coalesce(_filters ->> 'status', ''), 32), ''),
      'district', nullif(left(coalesce(_filters ->> 'district', ''), 100), ''),
      'taluka', nullif(left(coalesce(_filters ->> 'taluka', ''), 100), ''),
      'date', nullif(left(coalesce(_filters ->> 'date', ''), 32), ''),
      'sort', nullif(left(coalesce(_filters ->> 'sort', ''), 32), ''),
      'search_applied', coalesce(_filters ->> 'searchApplied', 'false') = 'true',
      'search_length', case
        when coalesce(_filters ->> 'searchLength', '') ~ '^[0-9]{1,3}$'
          then least((_filters ->> 'searchLength')::integer, 80)
        else 0
      end,
      'restricted_area_access', coalesce(_filters ->> 'restrictedAreaAccess', 'false') = 'true'
    )
  );

  v_metadata := jsonb_build_object(
    'export_mode', 'full_unmasked',
    'record_count', _record_count,
    'card_version', left(coalesce(nullif(trim(_card_version), ''), 'v1'), 16),
    'file_name', left(coalesce(nullif(trim(_file_name), ''), 'jas-member-card-data-full.csv'), 180),
    'area_scope', left(coalesce(nullif(trim(_area_scope), ''), 'All permitted membership records'), 240),
    'filters', v_safe_filters,
    'actor_roles', to_jsonb(v_actor_roles)
  );

  v_request_id := current_setting('request.headers.x-request-id', true);
  v_ip_address := coalesce(
    current_setting('request.headers.x-forwarded-for', true),
    current_setting('request.headers.cf-connecting-ip', true),
    current_setting('request.headers.x-real-ip', true)
  );
  v_user_agent := current_setting('request.headers.user-agent', true);

  insert into public.audit_logs (
    id,
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
    v_log_id,
    v_actor_user_id,
    v_actor_email,
    'insert',
    'Exported full unmasked member card CSV',
    'membership',
    'public',
    'member_card_csv_exports',
    null,
    format('Full member card CSV (%s records)', _record_count),
    null,
    v_metadata,
    v_metadata,
    nullif(v_request_id, ''),
    nullif(v_ip_address, ''),
    nullif(v_user_agent, '')
  );

  return v_log_id;
end;
$$;

revoke all on function public.log_member_card_csv_export(integer, jsonb, text, text, text)
from public, anon;

grant execute on function public.log_member_card_csv_export(integer, jsonb, text, text, text)
to authenticated;

comment on function public.log_member_card_csv_export(integer, jsonb, text, text, text) is
'Records a membership-admin full unmasked card CSV export without storing member rows, CNIC/mobile values, or search text.';
