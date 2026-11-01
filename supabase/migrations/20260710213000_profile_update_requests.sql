-- Phase 7: Member Profile Update Requests
-- Approved members can request changes to card/profile data without directly
-- editing the approved members row. Membership reviewers approve or reject the
-- request transactionally, with area checks, notifications, and audit logs.

create extension if not exists pgcrypto;

create table if not exists public.profile_update_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_name text not null,
  member_no text null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_changes jsonb not null,
  current_snapshot jsonb not null,
  member_note text null,
  admin_note text null,
  source_district text not null,
  source_taluka text null,
  target_district text not null,
  target_taluka text null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_update_requests_changes_object_check
    check (jsonb_typeof(requested_changes) = 'object'),
  constraint profile_update_requests_snapshot_object_check
    check (jsonb_typeof(current_snapshot) = 'object'),
  constraint profile_update_requests_nonempty_changes_check
    check (requested_changes <> '{}'::jsonb)
);

create unique index if not exists profile_update_requests_one_pending_per_member_idx
  on public.profile_update_requests(member_id)
  where status = 'pending';

create index if not exists profile_update_requests_user_created_idx
  on public.profile_update_requests(user_id, created_at desc);

create index if not exists profile_update_requests_status_created_idx
  on public.profile_update_requests(status, created_at desc);

create index if not exists profile_update_requests_source_area_idx
  on public.profile_update_requests(source_district, source_taluka, created_at desc);

create index if not exists profile_update_requests_target_area_idx
  on public.profile_update_requests(target_district, target_taluka, created_at desc);

alter table public.profile_update_requests enable row level security;
alter table public.profile_update_requests force row level security;

-- Members can view their own requests. Membership reviewers can view requests
-- that originate in or move into an area they are allowed to view.
drop policy if exists "Members and area reviewers can view profile update requests"
  on public.profile_update_requests;
create policy "Members and area reviewers can view profile update requests"
on public.profile_update_requests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.current_user_can_access_membership_area(source_district, source_taluka, 'view')
  or public.current_user_can_access_membership_area(target_district, target_taluka, 'view')
);

-- All writes go through the security-definer RPCs below.
drop policy if exists "No direct profile update request inserts"
  on public.profile_update_requests;
create policy "No direct profile update request inserts"
on public.profile_update_requests
for insert
to authenticated
with check (false);

drop policy if exists "No direct profile update request updates"
  on public.profile_update_requests;
create policy "No direct profile update request updates"
on public.profile_update_requests
for update
to authenticated
using (false)
with check (false);

drop policy if exists "No direct profile update request deletes"
  on public.profile_update_requests;
create policy "No direct profile update request deletes"
on public.profile_update_requests
for delete
to authenticated
using (false);

-- Approved members may upload a new photo only under the dedicated request
-- subfolder. They still cannot overwrite the active approved photo directly.
drop policy if exists "Approved members can upload profile update photos"
  on storage.objects;
create policy "Approved members can upload profile update photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'profile-update-requests'
  and name ~ (
    '^'
    || (select auth.uid())::text
    || '/profile-update-requests/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
  )
  and exists (
    select 1
    from public.members m
    where m.user_id = (select auth.uid())
      and m.status = 'approved'
  )
);

-- Recursively protect sensitive values, including values nested inside
-- requested_changes/current_snapshot JSON objects.
create or replace function public.audit_redact_jsonb(_data jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  _result jsonb;
begin
  if _data is null then
    return null;
  end if;

  if jsonb_typeof(_data) = 'object' then
    select coalesce(
      jsonb_object_agg(
        entry.key,
        case
          when lower(entry.key) similar to '%(password|secret|token|service_role|refresh_token|access_token|otp|session)%'
            then to_jsonb('[redacted]'::text)
          when lower(entry.key) similar to '%(cnic|mobile|phone|address|date_of_birth|emergency_contact_name|emergency_contact_relation|member_note)%'
            then to_jsonb('[protected]'::text)
          when lower(entry.key) similar to '%(photo_url|receipt_path|storage_path)%'
            then to_jsonb('[stored-file]'::text)
          else public.audit_redact_jsonb(entry.value)
        end
      ),
      '{}'::jsonb
    )
    into _result
    from jsonb_each(_data) entry;

    return _result;
  end if;

  if jsonb_typeof(_data) = 'array' then
    select coalesce(jsonb_agg(public.audit_redact_jsonb(item.value)), '[]'::jsonb)
    into _result
    from jsonb_array_elements(_data) item;

    return _result;
  end if;

  return _data;
end;
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
  if _table_name in (
    'members',
    'member_counters',
    'membership_payments',
    'profile_update_requests'
  ) then
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
  if _table_name = 'profile_update_requests' then
    if _action = 'insert' then return 'Member requested profile update'; end if;
    if _action = 'delete' then return 'Profile update request removed'; end if;
    if coalesce(_row_data ->> 'status', '') = 'approved' then
      return 'Profile update request approved';
    end if;
    if coalesce(_row_data ->> 'status', '') = 'rejected' then
      return 'Profile update request rejected';
    end if;
    if coalesce(_row_data ->> 'status', '') = 'cancelled' then
      return 'Profile update request cancelled';
    end if;
    return 'Profile update request updated';
  end if;

  if _table_name = 'members' then
    if _action = 'insert' then return 'Membership application created'; end if;
    if _action = 'delete' then return 'Membership application removed'; end if;

    if coalesce(_row_data ->> 'status', '') = 'approved' then
      return 'Membership application approved/updated';
    end if;

    if coalesce(_row_data ->> 'status', '') = 'rejected' then
      return 'Membership application rejected/updated';
    end if;

    return 'Membership application updated';
  end if;

  if _table_name = 'membership_payments' then
    if _action = 'insert' then return 'Membership payment created'; end if;
    if _action = 'delete' then return 'Membership payment removed'; end if;

    if coalesce(_row_data ->> 'status', '') = 'paid' then
      return 'Membership payment marked paid';
    end if;

    if coalesce(_row_data ->> 'status', '') = 'waived' then
      return 'Membership payment waived';
    end if;

    if coalesce(_row_data ->> 'status', '') = 'failed' then
      return 'Membership payment marked failed';
    end if;

    return 'Membership payment updated';
  end if;

  if _table_name = 'user_roles' then
    if _action = 'insert' then return 'Admin role assigned'; end if;
    if _action = 'delete' then return 'Admin role removed'; end if;
    return 'Admin role updated';
  end if;

  if _table_name = 'admin_area_permissions' then
    if _action = 'insert' then return 'Area permission granted'; end if;
    if _action = 'delete' then return 'Area permission removed'; end if;
    return 'Area permission updated';
  end if;

  if _table_name in ('program_applications', 'program_documents') then
    if _action = 'insert' then return 'Program record created'; end if;
    if _action = 'delete' then return 'Program record removed'; end if;
    return 'Program record updated';
  end if;

  if _table_name in ('finance_donations', 'finance_expenses', 'finance_audit_logs') then
    if _action = 'insert' then return 'Finance record created'; end if;
    if _action = 'delete' then return 'Finance record removed'; end if;
    return 'Finance record updated';
  end if;

  if _table_name in (
    'organization_committees',
    'organization_designations',
    'organization_committee_members'
  ) then
    if _action = 'insert' then return 'Organization record created'; end if;
    if _action = 'delete' then return 'Organization record removed'; end if;
    return 'Organization record updated';
  end if;

  if _table_name in ('cms_pages', 'news_posts', 'gallery_items', 'events') then
    if _action = 'insert' then return 'Public content created'; end if;
    if _action = 'delete' then return 'Public content removed'; end if;
    return 'Public content updated';
  end if;

  if _action = 'insert' then return 'Record created'; end if;
  if _action = 'delete' then return 'Record removed'; end if;
  return 'Record updated';
end;
$$;

create or replace function public.submit_profile_update_request(
  _requested_changes jsonb,
  _member_note text default null,
  _request_id uuid default null
)
returns public.profile_update_requests
language plpgsql
security definer
set search_path = public, app_private, auth, storage
as $$
declare
  _member public.members;
  _request public.profile_update_requests;
  _allowed_fields constant text[] := array[
    'full_name',
    'father_name',
    'cnic',
    'mobile',
    'district',
    'taluka',
    'profession',
    'caste_branch',
    'address',
    'date_of_birth',
    'gender',
    'education',
    'blood_group',
    'emergency_contact_name',
    'emergency_contact_relation',
    'emergency_contact_mobile',
    'photo_url'
  ];
  _key text;
  _value text;
  _clean jsonb := '{}'::jsonb;
  _snapshot jsonb := '{}'::jsonb;
  _member_json jsonb;
  _actual_changes jsonb := '{}'::jsonb;
  _target_district text;
  _target_taluka text;
  _date_value date;
  _effective_request_id uuid := coalesce(_request_id, gen_random_uuid());
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if char_length(coalesce(_member_note, '')) > 500 then
    raise exception 'Member note must be 500 characters or fewer.';
  end if;

  select *
  into _member
  from public.members
  where user_id = (select auth.uid())
  for update;

  if _member.id is null then
    raise exception 'Membership record not found.';
  end if;

  if _member.status <> 'approved' then
    raise exception 'Only approved members can request profile updates.';
  end if;

  if _requested_changes is null
    or jsonb_typeof(_requested_changes) <> 'object'
    or _requested_changes = '{}'::jsonb
  then
    raise exception 'At least one requested change is required.';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(_requested_changes) key_name
    where not (key_name = any(_allowed_fields))
  ) then
    raise exception 'The request contains a field that cannot be changed.';
  end if;

  if exists (
    select 1
    from public.profile_update_requests r
    where r.member_id = _member.id
      and r.status = 'pending'
  ) then
    raise exception 'A profile update request is already pending review.';
  end if;

  _member_json := to_jsonb(_member);

  for _key in select jsonb_object_keys(_requested_changes)
  loop
    _value := nullif(btrim(_requested_changes ->> _key), '');

    if _key in ('full_name', 'father_name') then
      if _value is null or char_length(_value) < 3 or char_length(_value) > 120 then
        raise exception '% must be between 3 and 120 characters.', replace(_key, '_', ' ');
      end if;
      _clean := _clean || jsonb_build_object(_key, _value);

    elsif _key = 'cnic' then
      if _value is null or _value !~ '^[0-9]{5}-[0-9]{7}-[0-9]$' then
        raise exception 'CNIC format is invalid.';
      end if;
      if exists (
        select 1 from public.members m
        where m.cnic = _value and m.id <> _member.id
      ) then
        raise exception 'This CNIC is already used by another member.';
      end if;
      _clean := _clean || jsonb_build_object(_key, _value);

    elsif _key = 'mobile' then
      if _value is null or _value !~ '^(\+92|0)3[0-9]{9}$' then
        raise exception 'Mobile number format is invalid.';
      end if;
      _clean := _clean || jsonb_build_object(_key, _value);

    elsif _key = 'district' then
      if _value is null or char_length(_value) > 80 then
        raise exception 'District is required.';
      end if;
      _clean := _clean || jsonb_build_object(_key, _value);

    elsif _key = 'taluka' then
      if _value is null or char_length(_value) > 100 then
        raise exception 'Taluka is required.';
      end if;
      _clean := _clean || jsonb_build_object(_key, _value);

    elsif _key in (
      'profession',
      'caste_branch',
      'education',
      'emergency_contact_name',
      'emergency_contact_relation'
    ) then
      if _value is not null and char_length(_value) > 160 then
        raise exception '% is too long.', replace(_key, '_', ' ');
      end if;
      _clean := _clean || jsonb_build_object(_key, to_jsonb(_value));

    elsif _key = 'address' then
      if _value is not null and char_length(_value) > 500 then
        raise exception 'Address is too long.';
      end if;
      _clean := _clean || jsonb_build_object(_key, to_jsonb(_value));

    elsif _key = 'date_of_birth' then
      if _value is null then
        _clean := _clean || jsonb_build_object(_key, null);
      else
        begin
          _date_value := _value::date;
        exception when others then
          raise exception 'Date of birth is invalid.';
        end;

        if _date_value > current_date then
          raise exception 'Date of birth cannot be in the future.';
        end if;

        _clean := _clean || jsonb_build_object(_key, _date_value::text);
      end if;

    elsif _key = 'gender' then
      if _value is not null
        and _value not in ('Male', 'Female', 'Other', 'Prefer not to say')
      then
        raise exception 'Gender value is invalid.';
      end if;
      _clean := _clean || jsonb_build_object(_key, to_jsonb(_value));

    elsif _key = 'blood_group' then
      if _value is not null
        and _value not in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
      then
        raise exception 'Blood group value is invalid.';
      end if;
      _clean := _clean || jsonb_build_object(_key, to_jsonb(_value));

    elsif _key = 'emergency_contact_mobile' then
      if _value is not null and _value !~ '^(\+92|0)3[0-9]{9}$' then
        raise exception 'Emergency contact mobile format is invalid.';
      end if;
      _clean := _clean || jsonb_build_object(_key, to_jsonb(_value));

    elsif _key = 'photo_url' then
      if _value is null
        or _value !~ (
          '^'
          || (select auth.uid())::text
          || '/profile-update-requests/'
          || _effective_request_id::text
          || '\.(jpg|jpeg|png|webp)$'
        )
      then
        raise exception 'Profile update photo path is invalid.';
      end if;

      if not exists (
        select 1
        from storage.objects o
        where o.bucket_id = 'member-photos'
          and o.name = _value
          and o.owner_id = (select auth.uid())::text
      ) then
        raise exception 'Uploaded profile update photo was not found.';
      end if;

      _clean := _clean || jsonb_build_object(_key, _value);
    end if;
  end loop;

  _target_district := coalesce(_clean ->> 'district', _member.district);
  _target_taluka := coalesce(_clean ->> 'taluka', _member.taluka);

  if _target_district is null or btrim(_target_district) = '' then
    raise exception 'District is required.';
  end if;

  if _target_taluka is null or btrim(_target_taluka) = '' then
    raise exception 'Taluka is required.';
  end if;

  if _clean ? 'district' and not (_clean ? 'taluka') then
    raise exception 'Select a taluka for the requested district.';
  end if;

  for _key in select jsonb_object_keys(_clean)
  loop
    if (_member_json -> _key) is distinct from (_clean -> _key) then
      _actual_changes := _actual_changes || jsonb_build_object(_key, _clean -> _key);
      _snapshot := _snapshot || jsonb_build_object(_key, _member_json -> _key);
    end if;
  end loop;

  if _actual_changes = '{}'::jsonb then
    raise exception 'No profile values were changed.';
  end if;

  insert into public.profile_update_requests (
    id,
    member_id,
    user_id,
    member_name,
    member_no,
    requested_changes,
    current_snapshot,
    member_note,
    source_district,
    source_taluka,
    target_district,
    target_taluka
  ) values (
    _effective_request_id,
    _member.id,
    _member.user_id,
    _member.full_name,
    _member.member_no,
    _actual_changes,
    _snapshot,
    nullif(btrim(_member_note), ''),
    _member.district,
    _member.taluka,
    _target_district,
    _target_taluka
  )
  returning * into _request;

  return _request;
end;
$$;

create or replace function public.cancel_profile_update_request(
  _request_id uuid
)
returns public.profile_update_requests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  _request public.profile_update_requests;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  update public.profile_update_requests
  set
    status = 'cancelled',
    admin_note = null,
    reviewed_by = null,
    reviewed_at = now(),
    updated_at = now()
  where id = _request_id
    and user_id = (select auth.uid())
    and status = 'pending'
  returning * into _request;

  if _request.id is null then
    raise exception 'Pending profile update request not found.';
  end if;

  return _request;
end;
$$;

create or replace function public.review_profile_update_request(
  _request_id uuid,
  _decision text,
  _admin_note text default null
)
returns public.profile_update_requests
language plpgsql
security definer
set search_path = public, app_private, auth
as $$
declare
  _request public.profile_update_requests;
  _member public.members;
  _member_json jsonb;
  _key text;
  _note text := nullif(btrim(_admin_note), '');
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;

  if _decision not in ('approved', 'rejected') then
    raise exception 'Review decision must be approved or rejected.';
  end if;

  if char_length(coalesce(_admin_note, '')) > 500 then
    raise exception 'Admin note must be 500 characters or fewer.';
  end if;

  select *
  into _request
  from public.profile_update_requests
  where id = _request_id
  for update;

  if _request.id is null then
    raise exception 'Profile update request not found.';
  end if;

  if _request.status <> 'pending' then
    raise exception 'This profile update request has already been reviewed.';
  end if;

  if not public.current_user_can_access_membership_area(
    _request.source_district,
    _request.source_taluka,
    'review'
  ) then
    raise exception 'You do not have permission to review this member area.';
  end if;

  if _decision = 'approved'
    and not public.current_user_can_access_membership_area(
      _request.target_district,
      _request.target_taluka,
      'review'
    )
  then
    raise exception 'You do not have permission to approve the requested target area.';
  end if;

  if _decision = 'rejected' then
    if _note is null or char_length(_note) < 3 then
      raise exception 'A rejection reason is required.';
    end if;

    update public.profile_update_requests
    set
      status = 'rejected',
      admin_note = _note,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      updated_at = now()
    where id = _request.id
    returning * into _request;

    perform public.create_notification(
      _request.user_id,
      'Profile update request rejected',
      'Your profile update request was not approved. Open the request to review the admin note.',
      'membership',
      'profile_update_request',
      _request.id,
      '/profile-update'
    );

    return _request;
  end if;

  select *
  into _member
  from public.members
  where id = _request.member_id
    and user_id = _request.user_id
  for update;

  if _member.id is null then
    raise exception 'Member record not found.';
  end if;

  if _member.status <> 'approved' then
    raise exception 'Only approved member profiles can be updated through this request.';
  end if;

  _member_json := to_jsonb(_member);

  -- Prevent a stale request from silently overwriting values changed after the
  -- member submitted it. Only requested fields are compared.
  for _key in select jsonb_object_keys(_request.requested_changes)
  loop
    if (_member_json -> _key) is distinct from (_request.current_snapshot -> _key) then
      raise exception 'Member data changed after this request was submitted. Reject this request and ask the member to submit a fresh request.';
    end if;
  end loop;

  if _request.requested_changes ? 'cnic'
    and exists (
      select 1
      from public.members m
      where m.cnic = (_request.requested_changes ->> 'cnic')
        and m.id <> _member.id
    )
  then
    raise exception 'The requested CNIC is already used by another member.';
  end if;

  update public.members
  set
    full_name = case when _request.requested_changes ? 'full_name'
      then _request.requested_changes ->> 'full_name' else full_name end,
    father_name = case when _request.requested_changes ? 'father_name'
      then _request.requested_changes ->> 'father_name' else father_name end,
    cnic = case when _request.requested_changes ? 'cnic'
      then _request.requested_changes ->> 'cnic' else cnic end,
    mobile = case when _request.requested_changes ? 'mobile'
      then _request.requested_changes ->> 'mobile' else mobile end,
    district = case when _request.requested_changes ? 'district'
      then _request.requested_changes ->> 'district' else district end,
    taluka = case when _request.requested_changes ? 'taluka'
      then nullif(_request.requested_changes ->> 'taluka', '') else taluka end,
    profession = case when _request.requested_changes ? 'profession'
      then nullif(_request.requested_changes ->> 'profession', '') else profession end,
    caste_branch = case when _request.requested_changes ? 'caste_branch'
      then nullif(_request.requested_changes ->> 'caste_branch', '') else caste_branch end,
    address = case when _request.requested_changes ? 'address'
      then nullif(_request.requested_changes ->> 'address', '') else address end,
    date_of_birth = case when _request.requested_changes ? 'date_of_birth'
      then nullif(_request.requested_changes ->> 'date_of_birth', '')::date else date_of_birth end,
    gender = case when _request.requested_changes ? 'gender'
      then nullif(_request.requested_changes ->> 'gender', '') else gender end,
    education = case when _request.requested_changes ? 'education'
      then nullif(_request.requested_changes ->> 'education', '') else education end,
    blood_group = case when _request.requested_changes ? 'blood_group'
      then nullif(_request.requested_changes ->> 'blood_group', '') else blood_group end,
    emergency_contact_name = case when _request.requested_changes ? 'emergency_contact_name'
      then nullif(_request.requested_changes ->> 'emergency_contact_name', '') else emergency_contact_name end,
    emergency_contact_relation = case when _request.requested_changes ? 'emergency_contact_relation'
      then nullif(_request.requested_changes ->> 'emergency_contact_relation', '') else emergency_contact_relation end,
    emergency_contact_mobile = case when _request.requested_changes ? 'emergency_contact_mobile'
      then nullif(_request.requested_changes ->> 'emergency_contact_mobile', '') else emergency_contact_mobile end,
    photo_url = case when _request.requested_changes ? 'photo_url'
      then _request.requested_changes ->> 'photo_url' else photo_url end
  where id = _member.id;

  update public.profile_update_requests
  set
    status = 'approved',
    admin_note = _note,
    reviewed_by = (select auth.uid()),
    reviewed_at = now(),
    updated_at = now()
  where id = _request.id
  returning * into _request;

  perform public.create_notification(
    _request.user_id,
    'Profile update request approved',
    'Your approved membership profile and digital card details have been updated.',
    'membership',
    'profile_update_request',
    _request.id,
    '/profile-update'
  );

  return _request;
end;
$$;

revoke all on function public.submit_profile_update_request(jsonb, text, uuid)
  from public, anon;
grant execute on function public.submit_profile_update_request(jsonb, text, uuid)
  to authenticated;

revoke all on function public.cancel_profile_update_request(uuid)
  from public, anon;
grant execute on function public.cancel_profile_update_request(uuid)
  to authenticated;

revoke all on function public.review_profile_update_request(uuid, text, text)
  from public, anon;
grant execute on function public.review_profile_update_request(uuid, text, text)
  to authenticated;

-- Reuse the existing updated-at helper and central audit trigger.
drop trigger if exists profile_update_requests_set_updated_at
  on public.profile_update_requests;
create trigger profile_update_requests_set_updated_at
before update on public.profile_update_requests
for each row execute function app_private.set_updated_at();

drop trigger if exists audit_log_changes
  on public.profile_update_requests;
create trigger audit_log_changes
after insert or update or delete on public.profile_update_requests
for each row execute function public.write_audit_log();

grant select on public.profile_update_requests to authenticated, service_role;
grant insert, update, delete on public.profile_update_requests to service_role;

comment on table public.profile_update_requests is
  'Member-submitted change requests for approved membership/card profile fields.';
comment on function public.submit_profile_update_request(jsonb, text, uuid) is
  'Creates one pending approved-member profile update request with validated changed fields only.';
comment on function public.review_profile_update_request(uuid, text, text) is
  'Area-aware membership reviewer approval/rejection. Approval updates members transactionally and notifies the member.';
