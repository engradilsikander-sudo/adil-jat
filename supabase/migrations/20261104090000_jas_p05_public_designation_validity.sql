-- JAS P0.5: restore the existing one-year inclusive designation rule.
-- Preserve P0.1 public identifiers, response contract, visibility gates and ordering.
-- No data rewrite and no membership-review/counter/payment changes.
begin;

create or replace function public.get_public_designation_holders()
returns table (
  public_key text,
  member_no text,
  full_name text,
  father_name text,
  photo_url text,
  level text,
  level_label text,
  designation_title text,
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
    'JAS-OB-'
      || extract(year from ocm.created_at at time zone 'UTC')::int::text
      || '-'
      || upper(left(replace(ocm.id::text, '-', ''), 8)) as public_key,
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
    oc.name as committee_name,
    oc.division,
    coalesce(oc.district, ocm.district_snapshot) as district,
    coalesce(oc.taluka, ocm.taluka_snapshot) as taluka,
    validity.valid_from as tenure_start,
    (validity.valid_from + interval '1 year' - interval '1 day')::date as tenure_end,
    ocm.sort_order,
    ocm.created_at as assigned_at
  from public.organization_committee_members ocm
  join public.organization_committees oc
    on oc.id = ocm.committee_id
  join public.members m
    on m.id = ocm.member_id
  cross join lateral (
    select coalesce(ocm.tenure_start, oc.tenure_start, ocm.created_at::date, current_date) as valid_from
  ) validity
  where ocm.status = 'active'
    and oc.status = 'active'
    and oc.public_display = true
    and m.status = 'approved'
    and validity.valid_from <= current_date
    and (validity.valid_from + interval '1 year' - interval '1 day')::date >= current_date
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

revoke all on function public.get_public_designation_holders() from public;
grant execute on function public.get_public_designation_holders() to anon, authenticated;

notify pgrst, 'reload schema';
commit;
