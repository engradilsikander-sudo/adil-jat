-- Divisional Committee & Designation Support Phase 1
-- Adds Divisional level between Central/Markaz and District committees.
-- Keeps existing Central, District and Taluka records intact.

alter table public.organization_committees
add column if not exists division text;

alter table public.organization_designations
drop constraint if exists organization_designations_scope_check;

alter table public.organization_designations
add constraint organization_designations_scope_check
check (scope in ('central', 'divisional', 'district', 'taluka'));

alter table public.organization_committees
drop constraint if exists organization_committees_committee_type_check;

alter table public.organization_committees
add constraint organization_committees_committee_type_check
check (committee_type in ('central', 'divisional', 'district', 'taluka'));

create index if not exists organization_committees_division_idx
  on public.organization_committees (division);

create index if not exists organization_committees_divisional_location_idx
  on public.organization_committees (committee_type, division)
  where committee_type = 'divisional';

insert into public.organization_designations (scope, title, sort_order) values
  ('divisional', 'Divisional President', 1),
  ('divisional', 'Divisional Vice President', 2),
  ('divisional', 'Divisional General Secretary', 3),
  ('divisional', 'Divisional Finance Secretary', 4),
  ('divisional', 'Divisional Information Secretary', 5),
  ('divisional', 'Divisional Coordinator', 6)
on conflict (scope, title) do update set
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- Optional consistency rule:
-- central committees should not store area fields,
-- divisional committees should store division only,
-- district committees should store district only,
-- taluka committees should store district and taluka.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_committees_area_shape_check'
      and conrelid = 'public.organization_committees'::regclass
  ) then
    alter table public.organization_committees
    add constraint organization_committees_area_shape_check
    check (
      (committee_type = 'central' and division is null and district is null and taluka is null)
      or (committee_type = 'divisional' and division is not null and district is null and taluka is null)
      or (committee_type = 'district' and division is null and district is not null and taluka is null)
      or (committee_type = 'taluka' and division is null and district is not null and taluka is not null)
    );
  end if;
end
$$;
