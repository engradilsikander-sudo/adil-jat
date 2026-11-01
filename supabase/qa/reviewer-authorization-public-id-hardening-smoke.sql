-- JAS P0.1 — Reviewer Authorization & Public-ID Hardening smoke tests
-- Run after 20260914050000_reviewer_authorization_public_id_hardening.sql.
-- These checks are read-only and fail closed if a required security boundary is missing.

begin;

do $$
begin
  if to_regprocedure('public.update_member_application_as_reviewer(uuid,uuid,jsonb)') is null then
    raise exception 'Missing update_member_application_as_reviewer RPC.';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.update_member_application_as_reviewer(uuid,uuid,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated users must not execute the privileged member edit RPC.';
  end if;

  if has_function_privilege(
    'anon',
    'public.update_member_application_as_reviewer(uuid,uuid,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous users must not execute the privileged member edit RPC.';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.update_member_application_as_reviewer(uuid,uuid,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Service role must be able to execute the privileged member edit RPC.';
  end if;
end;
$$;

do $$
declare
  result_signature text;
begin
  select pg_get_function_result('public.get_public_designation_holders()'::regprocedure)
  into result_signature;

  if result_signature ilike '%assignment_id%'
    or result_signature ilike '%member_id%'
    or result_signature ilike '%committee_id%'
  then
    raise exception 'Public designation-holder RPC still exposes internal UUID columns: %', result_signature;
  end if;

  if result_signature not ilike '%public_key%'
  then
    raise exception 'Public designation-holder RPC must expose the card-safe public_key.';
  end if;
end;
$$;

do $$
declare
  fn text;
begin
  select pg_get_functiondef('public.lookup_public_office_bearer(text)'::regprocedure)
  into fn;

  if fn like '%''member_id'',%'
    or fn like '%''committee_id'',%'
    or fn like '%jsonb_build_object(''id'',%'
  then
    raise exception 'Public office-bearer verification JSON still emits raw internal UUID keys.';
  end if;

  if fn not like '%''office_bearer_id''%'
  then
    raise exception 'Public office-bearer verification must retain the card-safe office_bearer_id.';
  end if;
end;
$$;

do $$
declare
  fn text;
begin
  select pg_get_functiondef('public.update_member_application_as_reviewer(uuid,uuid,jsonb)'::regprocedure)
  into fn;

  if fn not like '%current member area%'
    or fn not like '%destination member area%'
    or fn not like '%Member photo path must belong to the target member%'
  then
    raise exception 'Privileged member edit RPC is missing one or more required authorization checks.';
  end if;
end;
$$;

select
  'JAS P0.1 reviewer authorization and public-ID hardening smoke tests passed.' as result,
  now() as checked_at;

rollback;
