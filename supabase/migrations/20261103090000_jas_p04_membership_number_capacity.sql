-- JAS P0.4: preserve P0.3; only widen padding for long sequences.
begin;
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
  if auth.role() is distinct from 'service_role' then
    raise exception 'Only service role can approve members.';
  end if;

  if _reviewed_by is null or not app_private.user_has_any_app_role(
    _reviewed_by, array['admin','super_admin','membership_admin']
  ) then
    raise exception 'Membership reviewer required.' using errcode='42501';
  end if;

  select *
  into pending_member
  from public.members
  where id = _member_id
  for update;

  if pending_member.id is null or pending_member.status <> 'pending' then
    raise exception 'Application is no longer pending or is unavailable. Refresh before reviewing.' using errcode='P0001';
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

  perform set_config('app.audit_actor_user_id', _reviewed_by::text, true);

  current_year := extract(year from now())::int;

  insert into public.member_counters (year, last_seq)
  values (current_year, 1)
  on conflict (year)
  do update set last_seq = public.member_counters.last_seq + 1
  returning last_seq into next_seq;

  generated_no := 'JAS-' || current_year || '-' || lpad(next_seq::text, greatest(4, length(next_seq::text)), '0');

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

  if approved_member.id is null then
    raise exception 'Application changed. Refresh before reviewing.' using errcode='P0001';
  end if;
  return approved_member;
end;
$$;
revoke all on function public.approve_member(uuid,uuid) from public,anon,authenticated;
grant execute on function public.approve_member(uuid,uuid) to service_role;
notify pgrst, 'reload schema';
commit;
