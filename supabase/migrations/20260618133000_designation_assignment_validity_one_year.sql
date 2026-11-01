-- Designation Assignment Validity: one year from assignment date
-- Uses organization_committee_members.tenure_start as the designation assign date
-- and organization_committee_members.tenure_end as the auto expiry date.

create or replace function public.set_designation_assignment_validity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  _assign_date date;
begin
  if nullif(trim(coalesce(new.designation_title, '')), '') is not null then
    _assign_date := coalesce(new.tenure_start, new.created_at::date, current_date);
    new.tenure_start := _assign_date;

    if new.tenure_end is null or new.tenure_end < _assign_date then
      new.tenure_end := (_assign_date + interval '1 year')::date;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_designation_assignment_validity_before_write
  on public.organization_committee_members;

create trigger set_designation_assignment_validity_before_write
before insert or update of designation_title, tenure_start, tenure_end, status
on public.organization_committee_members
for each row
execute function public.set_designation_assignment_validity();

update public.organization_committee_members
set
  tenure_start = coalesce(tenure_start, created_at::date, current_date),
  tenure_end = case
    when tenure_end is null
      or tenure_end < coalesce(tenure_start, created_at::date, current_date)
    then (coalesce(tenure_start, created_at::date, current_date) + interval '1 year')::date
    else tenure_end
  end,
  updated_at = now()
where nullif(trim(coalesce(designation_title, '')), '') is not null
  and status = 'active'
  and (
    tenure_start is null
    or tenure_end is null
    or tenure_end < coalesce(tenure_start, created_at::date, current_date)
  );

create index if not exists organization_committee_members_validity_idx
  on public.organization_committee_members (status, tenure_start, tenure_end, created_at);

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
      and coalesce(ocm.tenure_start, ocm.created_at::date, current_date) <= current_date
      and coalesce(
        ocm.tenure_end,
        (coalesce(ocm.tenure_start, ocm.created_at::date, current_date) + interval '1 year')::date
      ) >= current_date
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
    coalesce(ocm.tenure_start, ocm.created_at::date, oc.tenure_start, current_date) as tenure_start,
    coalesce(
      ocm.tenure_end,
      (coalesce(ocm.tenure_start, ocm.created_at::date, current_date) + interval '1 year')::date,
      oc.tenure_end
    ) as tenure_end,
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
    and coalesce(ocm.tenure_start, ocm.created_at::date, current_date) <= current_date
    and coalesce(
      ocm.tenure_end,
      (coalesce(ocm.tenure_start, ocm.created_at::date, current_date) + interval '1 year')::date
    ) >= current_date
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

drop policy if exists "Public can read active public committee members" on public.organization_committee_members;
create policy "Public can read active public committee members"
  on public.organization_committee_members
  for select
  to anon, authenticated
  using (
    status = 'active'
    and coalesce(tenure_start, created_at::date, current_date) <= current_date
    and coalesce(
      tenure_end,
      (coalesce(tenure_start, created_at::date, current_date) + interval '1 year')::date
    ) >= current_date
    and exists (
      select 1
      from public.organization_committees oc
      where oc.id = organization_committee_members.committee_id
        and oc.public_display = true
        and oc.status = 'active'
    )
  );
