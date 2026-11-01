-- Public Committees Display + Designation Card Phase 1
-- Adds safe read policies for public committee pages and member designation cards.

-- Public visitors can read active committees that admins explicitly marked for public display.
drop policy if exists "Public can read active displayed committees" on public.organization_committees;
create policy "Public can read active displayed committees"
  on public.organization_committees
  for select
  to anon, authenticated
  using (public_display = true and status = 'active');

-- Members can read committee records connected to their own active designation card,
-- even if the committee itself is not public. This supports private/internal previews for the assigned member.
drop policy if exists "Members can read own designation committees" on public.organization_committees;
create policy "Members can read own designation committees"
  on public.organization_committees
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_committee_members ocm
      join public.members m on m.id = ocm.member_id
      where ocm.committee_id = organization_committees.id
        and ocm.status = 'active'
        and m.user_id = auth.uid()
    )
  );

-- Public visitors can read office bearer snapshot rows only for public active committees.
-- This avoids exposing the full members table and only shows the snapshot fields stored on committee assignment.
drop policy if exists "Public can read active public committee members" on public.organization_committee_members;
create policy "Public can read active public committee members"
  on public.organization_committee_members
  for select
  to anon, authenticated
  using (
    status = 'active'
    and exists (
      select 1
      from public.organization_committees oc
      where oc.id = organization_committee_members.committee_id
        and oc.public_display = true
        and oc.status = 'active'
    )
  );

-- Authenticated members can read their own active designation assignment rows.
drop policy if exists "Members can read own designation assignments" on public.organization_committee_members;
create policy "Members can read own designation assignments"
  on public.organization_committee_members
  for select
  to authenticated
  using (
    status = 'active'
    and exists (
      select 1
      from public.members m
      where m.id = organization_committee_members.member_id
        and m.user_id = auth.uid()
    )
  );

-- Public visitors can read active designation titles used for public committee display.
drop policy if exists "Public can read active organization designations" on public.organization_designations;
create policy "Public can read active organization designations"
  on public.organization_designations
  for select
  to anon, authenticated
  using (is_active = true);

-- Helpful indexes for public pages and designation cards.
create index if not exists organization_committees_public_idx
  on public.organization_committees (public_display, status, committee_type);

create index if not exists organization_committee_members_public_idx
  on public.organization_committee_members (committee_id, status, sort_order);
