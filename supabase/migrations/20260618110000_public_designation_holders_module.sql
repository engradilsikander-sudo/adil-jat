-- Public Designation Holders Module
-- Shows active designation holders in navbar/public directory order:
-- CEC -> Provincial -> Divisional -> District -> Taluka.

create schema if not exists app_private;
grant usage on schema app_private to anon, authenticated;

create or replace function app_private.member_photo_is_public_designation_holder(_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    join public.organization_committee_members ocm
      on ocm.member_id = m.id
     and ocm.status = 'active'
    join public.organization_committees oc
      on oc.id = ocm.committee_id
     and oc.status = 'active'
     and oc.public_display = true
    where m.status = 'approved'
      and m.photo_url = _object_name
      and m.user_id::text = split_part(_object_name, '/', 1)
  );
$$;

grant execute on function app_private.member_photo_is_public_designation_holder(text) to anon, authenticated;

create or replace function public.get_public_designation_holders()
returns table (
  assignment_id uuid,
  member_id uuid,
  member_no text,
  full_name text,
  father_name text,
  photo_url text,
  level text,
  level_label text,
  designation_title text,
  committee_id uuid,
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
    ocm.id as assignment_id,
    ocm.member_id,
    coalesce(m.member_no, ocm.member_no_snapshot) as member_no,
    coalesce(nullif(m.full_name, ''), ocm.full_name_snapshot) as full_name,
    coalesce(nullif(m.father_name, ''), ocm.father_name_snapshot) as father_name,
    nullif(m.photo_url, '') as photo_url,
    oc.committee_type as level,
    case oc.committee_type
      when 'central' then 'CEC'
      when 'provincial' then 'Provincial'
      when 'divisional' then 'Divisional'
      when 'district' then 'District'
      when 'taluka' then 'Taluka'
      else 'Level'
    end as level_label,
    ocm.designation_title,
    oc.id as committee_id,
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
      when 'provincial' then 2
      when 'divisional' then 3
      when 'district' then 4
      when 'taluka' then 5
      else 99
    end,
    coalesce(oc.division, oc.district, oc.taluka, oc.name),
    ocm.sort_order,
    ocm.created_at;
$$;

grant execute on function public.get_public_designation_holders() to anon, authenticated;

-- Private bucket remains private. This policy only allows signed/public reads for photos
-- of approved members who are active holders in active public committees.
drop policy if exists "Public can view active designation holder photos" on storage.objects;
create policy "Public can view active designation holder photos"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'member-photos'
  and app_private.member_photo_is_public_designation_holder(name)
);

create index if not exists organization_committee_members_public_directory_idx
  on public.organization_committee_members (status, committee_id, sort_order, created_at);

create index if not exists organization_committees_public_directory_idx
  on public.organization_committees (status, public_display, committee_type, division, district, taluka);

create index if not exists members_public_designation_holder_photo_idx
  on public.members (status, user_id, photo_url)
  where photo_url is not null;
