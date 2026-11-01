-- JAS P0.1 — Reviewer Authorization & Public-ID Hardening
--
-- 1) Move privileged member edits behind a service-role-only RPC that validates
--    reviewer role, current area, destination area, and member-photo ownership.
-- 2) Attribute the existing members audit trigger to the actual reviewer while
--    keeping the update + audit write in one transaction.
-- 3) Remove internal UUIDs from public member/designation verification payloads.

-- -----------------------------------------------------------------------------
-- Audit actor override for narrowly-scoped service-role RPCs.
-- Normal authenticated writes still prefer auth.uid().
-- -----------------------------------------------------------------------------
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

  -- Service-role RPCs do not carry the end-user UID in auth.uid(). A privileged
  -- RPC may set this transaction-local value after it has independently
  -- authorized the actor. It is never trusted ahead of a real authenticated UID.
  if v_actor_user_id is null then
    begin
      v_actor_user_id := nullif(current_setting('app.audit_actor_user_id', true), '')::uuid;
    exception when others then
      v_actor_user_id := null;
    end;
  end if;

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

-- -----------------------------------------------------------------------------
-- Atomic, area-scoped reviewer edit RPC.
-- -----------------------------------------------------------------------------
create or replace function public.update_member_application_as_reviewer(
  _member_id uuid,
  _reviewed_by uuid,
  _payload jsonb
)
returns public.members
language plpgsql
security definer
set search_path = app_private, public, pg_temp
as $$
declare
  current_member public.members;
  updated_member public.members;
  destination_district text;
  destination_taluka text;
  destination_photo_url text;
  unexpected_key text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only service role can update member applications.' using errcode = '42501';
  end if;

  if _member_id is null or _reviewed_by is null then
    raise exception 'Member and reviewer are required.' using errcode = '22023';
  end if;

  if _payload is null or jsonb_typeof(_payload) <> 'object' then
    raise exception 'Application payload must be an object.' using errcode = '22023';
  end if;

  select key
  into unexpected_key
  from jsonb_object_keys(_payload) as keys(key)
  where key <> all (array[
    'full_name',
    'father_name',
    'cnic',
    'mobile',
    'district',
    'taluka',
    'address',
    'date_of_birth',
    'gender',
    'education',
    'blood_group',
    'profession',
    'caste_branch',
    'emergency_contact_name',
    'emergency_contact_relation',
    'emergency_contact_mobile',
    'declaration_accepted',
    'photo_url'
  ]::text[])
  limit 1;

  if unexpected_key is not null then
    raise exception 'Field % cannot be changed through member application editing.', unexpected_key
      using errcode = '22023';
  end if;

  if not app_private.user_has_any_app_role(
    _reviewed_by,
    array['admin', 'super_admin', 'membership_admin']
  ) then
    raise exception 'Membership admin access required.' using errcode = '42501';
  end if;

  select *
  into current_member
  from public.members
  where id = _member_id
  for update;

  if current_member.id is null then
    raise exception 'Member record not found.' using errcode = 'P0002';
  end if;

  if not app_private.user_can_access_area_module(
    _reviewed_by,
    'membership',
    current_member.district,
    current_member.taluka,
    'review'
  ) then
    raise exception 'Reviewer does not have membership review access for the current member area.'
      using errcode = '42501';
  end if;

  destination_district := nullif(btrim(_payload ->> 'district'), '');
  destination_taluka := nullif(btrim(_payload ->> 'taluka'), '');
  destination_photo_url := coalesce(nullif(btrim(_payload ->> 'photo_url'), ''), '');

  if destination_district is null then
    raise exception 'District is required.' using errcode = '22023';
  end if;

  if nullif(btrim(_payload ->> 'full_name'), '') is null
    or nullif(btrim(_payload ->> 'father_name'), '') is null
    or nullif(btrim(_payload ->> 'cnic'), '') is null
    or nullif(btrim(_payload ->> 'mobile'), '') is null
    or nullif(btrim(_payload ->> 'address'), '') is null
  then
    raise exception 'Required member application fields cannot be empty.' using errcode = '22023';
  end if;

  if not app_private.user_can_access_area_module(
    _reviewed_by,
    'membership',
    destination_district,
    destination_taluka,
    'review'
  ) then
    raise exception 'Reviewer does not have membership review access for the destination member area.'
      using errcode = '42501';
  end if;

  if destination_photo_url <> '' and (
    split_part(destination_photo_url, '/', 1) <> current_member.user_id::text
    or left(destination_photo_url, 1) = '/'
    or position(chr(92) in destination_photo_url) > 0
    or destination_photo_url ~ '(^|/)\.\.(/|$)'
    or destination_photo_url ~* '^[[:alpha:]][[:alnum:]+.-]*://'
  ) then
    raise exception 'Member photo path must belong to the target member.' using errcode = '42501';
  end if;

  if jsonb_typeof(_payload -> 'declaration_accepted') is distinct from 'boolean' then
    raise exception 'Declaration accepted must be true or false.' using errcode = '22023';
  end if;

  perform set_config('app.audit_actor_user_id', _reviewed_by::text, true);

  update public.members
  set
    full_name = btrim(_payload ->> 'full_name'),
    father_name = btrim(_payload ->> 'father_name'),
    cnic = btrim(_payload ->> 'cnic'),
    mobile = btrim(_payload ->> 'mobile'),
    district = destination_district,
    taluka = destination_taluka,
    address = btrim(_payload ->> 'address'),
    date_of_birth = nullif(btrim(_payload ->> 'date_of_birth'), '')::date,
    gender = nullif(btrim(_payload ->> 'gender'), ''),
    education = nullif(btrim(_payload ->> 'education'), ''),
    blood_group = nullif(btrim(_payload ->> 'blood_group'), ''),
    profession = nullif(btrim(_payload ->> 'profession'), ''),
    caste_branch = nullif(btrim(_payload ->> 'caste_branch'), ''),
    emergency_contact_name = nullif(btrim(_payload ->> 'emergency_contact_name'), ''),
    emergency_contact_relation = nullif(btrim(_payload ->> 'emergency_contact_relation'), ''),
    emergency_contact_mobile = nullif(btrim(_payload ->> 'emergency_contact_mobile'), ''),
    declaration_accepted = (_payload ->> 'declaration_accepted')::boolean,
    photo_url = destination_photo_url
  where id = _member_id
  returning * into updated_member;

  if updated_member.id is null then
    raise exception 'Application could not be updated.' using errcode = 'P0001';
  end if;

  return updated_member;
end;
$$;

revoke all on function public.update_member_application_as_reviewer(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.update_member_application_as_reviewer(uuid, uuid, jsonb)
  to service_role;

-- -----------------------------------------------------------------------------
-- Public designation-holder directory: expose a card-safe public key instead of
-- raw assignment/member/committee UUIDs.
-- -----------------------------------------------------------------------------
drop function if exists public.get_public_designation_holders();

create function public.get_public_designation_holders()
returns table (
  public_key text,
  member_no text,
  full_name text,
  father_name text,
  photo_url text,
  level text,
  level_label text,
  designation_title text,
  committee_name text,
  division text,
  district text,
  taluka text,
  tenure_start date,
  tenure_end date,
  sort_order integer,
  assigned_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    'JAS-OB-'
      || extract(year from ocm.created_at at time zone 'UTC')::int::text
      || '-'
      || upper(left(replace(ocm.id::text, '-', ''), 8)) as public_key,
    coalesce(m.member_no, ocm.member_no_snapshot) as member_no,
    coalesce(nullif(m.full_name, ''), ocm.full_name_snapshot) as full_name,
    coalesce(nullif(m.father_name, ''), ocm.father_name_snapshot) as father_name,
    nullif(m.photo_url, '') as photo_url,
    oc.committee_type as level,
    case oc.committee_type
      when 'central' then 'CEC'
      when 'central_advisory' then 'Advisory'
      when 'provincial' then 'Provincial'
      when 'divisional' then 'Divisional'
      when 'district' then 'District'
      when 'taluka' then 'Taluka'
      else 'Level'
    end as level_label,
    ocm.designation_title,
    oc.name as committee_name,
    oc.division,
    coalesce(oc.district, ocm.district_snapshot) as district,
    coalesce(oc.taluka, ocm.taluka_snapshot) as taluka,
    coalesce(ocm.tenure_start, oc.tenure_start) as tenure_start,
    coalesce(ocm.tenure_end, oc.tenure_end) as tenure_end,
    ocm.sort_order,
    ocm.created_at as assigned_at
  from public.organization_committee_members ocm
  join public.organization_committees oc
    on oc.id = ocm.committee_id
  join public.members m
    on m.id = ocm.member_id
  where ocm.status = 'active'
    and oc.status = 'active'
    and oc.public_display = true
    and m.status = 'approved'
  order by
    case oc.committee_type
      when 'central' then 1
      when 'central_advisory' then 2
      when 'provincial' then 3
      when 'divisional' then 4
      when 'district' then 5
      when 'taluka' then 6
      else 99
    end,
    coalesce(oc.division, oc.district, oc.taluka, oc.name),
    ocm.sort_order,
    ocm.created_at;
$$;

revoke all on function public.get_public_designation_holders() from public;
grant execute on function public.get_public_designation_holders() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Public office-bearer verification: keep the human/card identifier, remove all
-- raw internal UUIDs from the JSON response.
-- -----------------------------------------------------------------------------
create or replace function public.lookup_public_office_bearer(_card_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  result jsonb;
  matches integer;
begin
  if _card_id is null or _card_id !~ '^JAS-OB-[0-9]{4}-[A-F0-9]{8}$' then
    return null;
  end if;

  select count(*)
  into matches
  from public.organization_committee_members a
  where upper(left(replace(a.id::text, '-', ''), 8)) = right(_card_id, 8)
    and extract(year from a.created_at at time zone 'UTC')::text = split_part(_card_id, '-', 3);

  if matches <> 1 then
    return null;
  end if;

  select jsonb_build_object(
    'office_bearer_id', _card_id,
    'designation_title', a.designation_title,
    'status', a.status,
    'sort_order', a.sort_order,
    'tenure_start', a.tenure_start,
    'tenure_end', a.tenure_end,
    'member_no_snapshot', m.member_no,
    'full_name_snapshot', m.full_name,
    'father_name_snapshot', m.father_name,
    'district_snapshot', m.district,
    'taluka_snapshot', m.taluka,
    'created_at', a.created_at,
    'updated_at', a.updated_at,
    'committee', jsonb_build_object(
      'name', c.name,
      'committee_type', c.committee_type,
      'division', c.division,
      'district', c.district,
      'taluka', c.taluka,
      'status', c.status,
      'public_display', true,
      'notes', null,
      'tenure_start', c.tenure_start,
      'tenure_end', c.tenure_end,
      'created_at', c.created_at,
      'updated_at', c.updated_at
    ),
    'member', jsonb_build_object(
      'full_name', m.full_name,
      'father_name', m.father_name,
      'member_no', m.member_no,
      'district', m.district,
      'taluka', m.taluka,
      'status', m.status
    ),
    'photoSignedUrl', null
  )
  into result
  from public.organization_committee_members a
  join public.organization_committees c on c.id = a.committee_id
  join public.members m on m.id = a.member_id
  where upper(left(replace(a.id::text, '-', ''), 8)) = right(_card_id, 8)
    and extract(year from a.created_at at time zone 'UTC')::text = split_part(_card_id, '-', 3)
    and a.status = 'active'
    and c.status = 'active'
    and c.public_display
    and m.status = 'approved'
    and a.tenure_start <= current_date
    and a.tenure_end >= current_date;

  return result;
end;
$$;

revoke all on function public.lookup_public_office_bearer(text) from public, anon, authenticated;
grant execute on function public.lookup_public_office_bearer(text) to service_role;
