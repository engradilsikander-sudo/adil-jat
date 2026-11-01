-- JAS P0.1 integration tests: reviewer authorization + atomic audit attribution.
-- Intended for LOCAL/STAGING Supabase after all migrations are applied.
-- The whole test runs inside a transaction and is rolled back.

begin;

do $$
declare
  reviewer_id uuid := 'a1000000-0000-4000-8000-000000000001';
  member_user_a uuid := 'a1000000-0000-4000-8000-000000000002';
  member_user_b uuid := 'a1000000-0000-4000-8000-000000000003';
  member_a uuid := 'a1000000-0000-4000-8000-000000000011';
  member_b uuid := 'a1000000-0000-4000-8000-000000000012';
  payload jsonb;
  updated public.members;
  denied boolean;
  audit_count integer;
  audit_actor uuid;
begin
  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values
    (
      reviewer_id,
      'authenticated',
      'authenticated',
      'jas-p01-reviewer@example.invalid',
      '',
      now(),
      '{}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      member_user_a,
      'authenticated',
      'authenticated',
      'jas-p01-member-a@example.invalid',
      '',
      now(),
      '{}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      member_user_b,
      'authenticated',
      'authenticated',
      'jas-p01-member-b@example.invalid',
      '',
      now(),
      '{}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );

  insert into public.user_roles (user_id, role)
  values (reviewer_id, 'membership_admin');

  insert into public.admin_area_permissions (
    user_id,
    module_key,
    scope,
    district,
    taluka,
    can_view,
    can_review,
    can_approve,
    is_active
  ) values (
    reviewer_id,
    'membership',
    'district',
    'Umerkot',
    null,
    true,
    true,
    false,
    true
  );

  insert into public.members (
    id,
    user_id,
    member_no,
    full_name,
    father_name,
    cnic,
    mobile,
    district,
    taluka,
    address,
    declaration_accepted,
    photo_url,
    status,
    approved_at
  ) values
    (
      member_a,
      member_user_a,
      'JAS-2099-9001',
      'P0.1 Member A',
      'P0.1 Father A',
      '11111-1111111-1',
      '03000000001',
      'Umerkot',
      'Kunri',
      'Kunri, Umerkot',
      true,
      member_user_a::text || '/photo.jpg',
      'approved',
      now()
    ),
    (
      member_b,
      member_user_b,
      'JAS-2099-9002',
      'P0.1 Member B',
      'P0.1 Father B',
      '22222-2222222-2',
      '03000000002',
      'Badin',
      null,
      'Badin',
      true,
      member_user_b::text || '/photo.jpg',
      'approved',
      now()
    );

  -- Simulate the service-role execution context used by the TanStack server action.
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  payload := jsonb_build_object(
    'full_name', 'P0.1 Member A Updated',
    'father_name', 'P0.1 Father A',
    'cnic', '11111-1111111-1',
    'mobile', '03000000001',
    'district', 'Umerkot',
    'taluka', 'Kunri',
    'address', 'Kunri, Umerkot',
    'date_of_birth', null,
    'gender', null,
    'education', null,
    'blood_group', null,
    'profession', null,
    'caste_branch', null,
    'emergency_contact_name', null,
    'emergency_contact_relation', null,
    'emergency_contact_mobile', null,
    'declaration_accepted', true,
    'photo_url', member_user_a::text || '/photo.jpg'
  );

  updated := public.update_member_application_as_reviewer(member_a, reviewer_id, payload);

  if updated.full_name <> 'P0.1 Member A Updated' then
    raise exception 'Expected authorized same-area member edit to succeed.';
  end if;

  select count(*)
  into audit_count
  from public.audit_logs
  where entity_table = 'members'
    and entity_id = member_a
    and action = 'update';

  select actor_user_id
  into audit_actor
  from public.audit_logs
  where entity_table = 'members'
    and entity_id = member_a
    and action = 'update'
  order by created_at desc
  limit 1;

  if audit_count <> 1 then
    raise exception 'Expected exactly one database audit event for the authorized edit; got %.', audit_count;
  end if;

  if audit_actor is distinct from reviewer_id then
    raise exception 'Expected audit actor % but got %.', reviewer_id, audit_actor;
  end if;

  -- A reviewer with Umerkot scope must not move the member into Badin.
  denied := false;
  begin
    perform public.update_member_application_as_reviewer(
      member_a,
      reviewer_id,
      payload || jsonb_build_object('district', 'Badin', 'taluka', null)
    );
  exception when sqlstate '42501' then
    denied := true;
  end;

  if not denied then
    raise exception 'Expected unauthorized destination-area edit to be denied.';
  end if;

  -- A reviewer with Umerkot scope must not edit a member whose current area is Badin.
  denied := false;
  begin
    perform public.update_member_application_as_reviewer(
      member_b,
      reviewer_id,
      payload || jsonb_build_object(
        'full_name', 'P0.1 Member B Updated',
        'father_name', 'P0.1 Father B',
        'cnic', '22222-2222222-2',
        'mobile', '03000000002',
        'district', 'Badin',
        'taluka', null,
        'address', 'Badin',
        'photo_url', member_user_b::text || '/photo.jpg'
      )
    );
  exception when sqlstate '42501' then
    denied := true;
  end;

  if not denied then
    raise exception 'Expected out-of-area target member edit to be denied.';
  end if;

  -- An authorized reviewer cannot attach a path from another member's photo folder.
  denied := false;
  begin
    perform public.update_member_application_as_reviewer(
      member_a,
      reviewer_id,
      payload || jsonb_build_object('photo_url', member_user_b::text || '/photo.jpg')
    );
  exception when sqlstate '42501' then
    denied := true;
  end;

  if not denied then
    raise exception 'Expected foreign member-photo path to be denied.';
  end if;

  select count(*)
  into audit_count
  from public.audit_logs
  where entity_table = 'members'
    and entity_id = member_a
    and action = 'update';

  if audit_count <> 1 then
    raise exception 'Denied edits must not create extra member update audit events; got %.', audit_count;
  end if;
end;
$$;

select 'JAS P0.1 reviewer authorization integration tests passed.' as result;

rollback;
