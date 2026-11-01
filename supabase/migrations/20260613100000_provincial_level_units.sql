-- Provincial Level Units support
-- Adds Provincial between Central Executive Committee and Divisional levels.
-- Also updates the area-shape rules so divisional units use division, not district.

alter table public.organization_designations
  drop constraint if exists organization_designations_scope_check;

alter table public.organization_designations
  add constraint organization_designations_scope_check
  check (scope in ('central', 'provincial', 'divisional', 'district', 'taluka'));

alter table public.organization_committees
  drop constraint if exists organization_committees_committee_type_check;

alter table public.organization_committees
  add constraint organization_committees_committee_type_check
  check (committee_type in ('central', 'provincial', 'divisional', 'district', 'taluka'));

alter table public.organization_committees
  drop constraint if exists organization_committees_area_shape_check;

alter table public.organization_committees
  add constraint organization_committees_area_shape_check
  check (
    (committee_type = 'central' and division is null and district is null and taluka is null)
    or (committee_type = 'provincial' and division is null and district is null and taluka is null)
    or (committee_type = 'divisional' and division is not null and district is null and taluka is null)
    or (committee_type = 'district' and division is null and district is not null and taluka is null)
    or (committee_type = 'taluka' and division is null and district is not null and taluka is not null)
  );

create index if not exists organization_committees_provincial_idx
  on public.organization_committees (committee_type)
  where committee_type = 'provincial';

insert into public.organization_designations (scope, title, sort_order) values
  ('provincial', 'Provincial President', 1),
  ('provincial', 'Provincial Senior Vice President', 2),
  ('provincial', 'Provincial Vice President', 3),
  ('provincial', 'Provincial General Secretary', 4),
  ('provincial', 'Provincial Information Secretary', 5),
  ('provincial', 'Provincial Finance Secretary', 6),
  ('provincial', 'Provincial Joint Secretary', 7),
  ('provincial', 'Provincial Coordinator', 8)
on conflict (scope, title) do update set
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
