-- Central Advisory Committee level support
-- Adds a separate Central Advisory Committee organization level with its own designation scope.

alter table public.organization_designations
  drop constraint if exists organization_designations_scope_check;

alter table public.organization_designations
  add constraint organization_designations_scope_check
  check (scope in ('central', 'central_advisory', 'provincial', 'divisional', 'district', 'taluka'));

alter table public.organization_committees
  drop constraint if exists organization_committees_committee_type_check;

alter table public.organization_committees
  add constraint organization_committees_committee_type_check
  check (committee_type in ('central', 'central_advisory', 'provincial', 'divisional', 'district', 'taluka'));

alter table public.organization_committees
  drop constraint if exists organization_committees_area_shape_check;

alter table public.organization_committees
  add constraint organization_committees_area_shape_check
  check (
    (committee_type = 'central' and division is null and district is null and taluka is null)
    or (committee_type = 'central_advisory' and division is null and district is null and taluka is null)
    or (committee_type = 'provincial' and division is null and district is null and taluka is null)
    or (committee_type = 'divisional' and division is not null and district is null and taluka is null)
    or (committee_type = 'district' and division is null and district is not null and taluka is null)
    or (committee_type = 'taluka' and division is null and district is not null and taluka is not null)
  );

create index if not exists organization_committees_central_advisory_idx
  on public.organization_committees (committee_type)
  where committee_type = 'central_advisory';

insert into public.organization_designations (scope, title, sort_order) values
  ('central_advisory', 'Chief Patron', 1),
  ('central_advisory', 'Patron', 2),
  ('central_advisory', 'Senior Advisor', 3),
  ('central_advisory', 'Advisor', 4),
  ('central_advisory', 'Legal Advisor', 5),
  ('central_advisory', 'Media Advisor', 6),
  ('central_advisory', 'Policy Advisor', 7),
  ('central_advisory', 'Advisory Board Member', 8)
on conflict (scope, title) do update set
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

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
      when 'central_advisory' then 'Advisory'
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

grant execute on function public.get_public_designation_holders() to anon, authenticated;
