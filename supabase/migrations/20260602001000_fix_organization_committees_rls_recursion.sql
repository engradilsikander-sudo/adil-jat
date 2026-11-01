-- Fix organization committee RLS recursion
-- Problem: organization_committees policies queried organization_committee_members,
-- while organization_committee_members policies queried organization_committees.
-- That circular RLS dependency causes: 42P17 infinite recursion detected in policy.

create schema if not exists app_private;

grant usage on schema app_private to anon, authenticated;

create or replace function app_private.committee_is_public_active(_committee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_committees oc
    where oc.id = _committee_id
      and oc.public_display = true
      and oc.status = 'active'
  );
$$;

create or replace function app_private.current_user_has_active_committee_assignment(_committee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_committee_members ocm
    join public.members m on m.id = ocm.member_id
    where ocm.committee_id = _committee_id
      and ocm.status = 'active'
      and m.user_id = auth.uid()
  );
$$;

create or replace function app_private.current_user_owns_committee_member(_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.id = _member_id
      and m.user_id = auth.uid()
  );
$$;

grant execute on function app_private.committee_is_public_active(uuid) to anon, authenticated;
grant execute on function app_private.current_user_has_active_committee_assignment(uuid) to authenticated;
grant execute on function app_private.current_user_owns_committee_member(uuid) to authenticated;

-- Replace only the recursive policies with helper-function based policies.
-- Keep admin policies and direct public committee policy as-is.

drop policy if exists "Members can read own designation committees"
on public.organization_committees;

create policy "Members can read own designation committees"
on public.organization_committees
for select
to authenticated
using (
  app_private.current_user_has_active_committee_assignment(id)
);


drop policy if exists "Public can read active public committee members"
on public.organization_committee_members;

create policy "Public can read active public committee members"
on public.organization_committee_members
for select
to anon, authenticated
using (
  status = 'active'
  and app_private.committee_is_public_active(committee_id)
);


drop policy if exists "Members can read own designation assignments"
on public.organization_committee_members;

create policy "Members can read own designation assignments"
on public.organization_committee_members
for select
to authenticated
using (
  status = 'active'
  and app_private.current_user_owns_committee_member(member_id)
);
