-- JAS Mobile UX.6: membership admin directory counts, facets and pagination.
-- SECURITY INVOKER: members RLS still applies. The explicit area predicate is
-- essential because members' self-read RLS could otherwise include an admin's
-- own membership record outside their assigned district/taluka.
-- No membership records, permission rows or existing policies are changed.

create or replace function public.membership_admin_directory_summary()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, app_private, pg_temp
as $$
declare
  result jsonb;
begin
  if (select auth.uid()) is null
    or not app_private.user_has_any_app_role(
      (select auth.uid()), array['admin', 'super_admin', 'membership_admin']
    )
    or not public.current_user_can_manage_membership()
  then
    raise exception 'Membership administrator access required' using errcode = '42501';
  end if;

  with scoped as materialized (
    select m.district, m.taluka, m.status, m.member_no
    from public.members m
    where public.current_user_can_access_membership_area(m.district, m.taluka, 'view')
  ), locations as (
    select distinct district, taluka from scoped
    where district is not null and btrim(district) <> ''
  )
  select jsonb_build_object(
    'stats', jsonb_build_object(
      'total', (select count(*) from scoped),
      'pending', (select count(*) from scoped where status = 'pending'),
      'approved', (select count(*) from scoped where status = 'approved'),
      'rejected', (select count(*) from scoped where status = 'rejected'),
      'cards', (select count(*) from scoped where status = 'approved' and nullif(btrim(member_no), '') is not null)
    ),
    'locations', coalesce(
      (select jsonb_agg(jsonb_build_object('district', district, 'taluka', taluka)
                        order by district, taluka nulls first)
       from locations),
      '[]'::jsonb
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.membership_admin_directory_summary() from public, anon;
grant execute on function public.membership_admin_directory_summary() to authenticated;

create or replace function public.membership_admin_directory_page(
  _status text default 'all',
  _district text default 'all',
  _taluka text default 'all',
  _created_from timestamptz default null,
  _search text default '',
  _sort text default 'newest',
  _page integer default 0,
  _page_size integer default 50
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, app_private, pg_temp
as $$
declare
  result jsonb;
  search_term text := left(btrim(coalesce(_search, '')), 80);
begin
  if (select auth.uid()) is null
    or not app_private.user_has_any_app_role(
      (select auth.uid()), array['admin', 'super_admin', 'membership_admin']
    )
    or not public.current_user_can_manage_membership()
  then
    raise exception 'Membership administrator access required' using errcode = '42501';
  end if;

  if coalesce(_status, 'all') not in ('all', 'pending', 'approved', 'rejected')
    or coalesce(_sort, 'newest') not in ('newest', 'oldest', 'name', 'district')
    or _page is null or _page < 0 or _page > 1000000
    or _page_size is null or _page_size < 1 or _page_size > 50
  then
    raise exception 'Invalid membership directory filter or page size' using errcode = '22023';
  end if;

  with filtered as materialized (
    select m.id, m.full_name, m.cnic, m.mobile, m.district, m.taluka,
           m.photo_url, m.status, m.member_no, m.created_at
    from public.members m
    where public.current_user_can_access_membership_area(m.district, m.taluka, 'view')
      and (coalesce(_status, 'all') = 'all' or m.status::text = _status)
      and (coalesce(_district, 'all') = 'all' or m.district = _district)
      and (coalesce(_taluka, 'all') = 'all' or m.taluka = _taluka)
      and (_created_from is null or m.created_at >= _created_from)
      and (
        search_term = ''
        or m.full_name ilike '%' || search_term || '%'
        or m.cnic ilike '%' || search_term || '%'
        or m.mobile ilike '%' || search_term || '%'
        or m.district ilike '%' || search_term || '%'
        or coalesce(m.taluka, '') ilike '%' || search_term || '%'
        or coalesce(m.member_no, '') ilike '%' || search_term || '%'
      )
  ), selected_page as (
    select filtered.*, row_number() over (order by
      case when _sort = 'oldest' then created_at end asc nulls last,
      case when _sort = 'newest' then created_at end desc nulls last,
      case when _sort = 'name' then full_name end asc nulls last,
      case when _sort = 'name' then created_at end desc nulls last,
      case when _sort = 'district' then district end asc nulls last,
      case when _sort = 'district' then taluka end asc nulls last,
      case when _sort = 'district' then created_at end desc nulls last,
      id asc
    ) as row_position from filtered
    order by
      case when _sort = 'oldest' then created_at end asc nulls last,
      case when _sort = 'newest' then created_at end desc nulls last,
      case when _sort = 'name' then full_name end asc nulls last,
      case when _sort = 'name' then created_at end desc nulls last,
      case when _sort = 'district' then district end asc nulls last,
      case when _sort = 'district' then taluka end asc nulls last,
      case when _sort = 'district' then created_at end desc nulls last,
      id asc
    limit _page_size offset (_page::bigint * _page_size)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((select jsonb_agg(to_jsonb(p) - 'row_position' order by p.row_position) from selected_page p), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.membership_admin_directory_page(text, text, text, timestamptz, text, text, integer, integer) from public, anon;
grant execute on function public.membership_admin_directory_page(text, text, text, timestamptz, text, text, integer, integer) to authenticated;

comment on function public.membership_admin_directory_summary() is
  'UX.6: All authorized membership area totals and district/taluka facets, independent of pagination.';
comment on function public.membership_admin_directory_page(text, text, text, timestamptz, text, text, integer, integer) is
  'UX.6: Membership area-scoped filtered directory with exact scoped count and stable database pagination.';
