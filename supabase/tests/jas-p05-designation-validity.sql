-- Disposable local Supabase only, as postgres. All fixture writes roll back.
-- Two legacy rows are created with the validity trigger briefly disabled INSIDE
-- this transaction; it is re-enabled before assertions. No other writers allowed.
\set ON_ERROR_STOP on
begin;
set local timezone = 'UTC';
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create temp table p05_cases (
 name text primary key, assignment_id uuid, public_key text, photo_path text,
 visible boolean, expected_start date, expected_end date
);
grant select on p05_cases to anon, authenticated;

-- Preserve evidence that this test does not replace review RPCs or touch counters.
create temp table p05_before as select
 pg_get_functiondef('public.approve_member(uuid,uuid)'::regprocedure) as approve_def,
 (select coalesce(jsonb_agg(to_jsonb(counter_row) order by counter_row.year),'[]'::jsonb) from public.member_counters counter_row) as counters;

do $$
declare
 label text; uid uuid; mid uuid; cid uuid; aid uuid; digits text;
 starts date; ends date; visible boolean; key text; committee_kind text;
begin
 foreach label in array array[
  'starts_today','expires_today','future','expired','expired_yesterday','inactive_assignment',
  'inactive_committee','private_committee','pending_member','advisory',
  'long_committee_end','missing_end','legacy_committee_start','legacy_created_start'
 ] loop
  uid:=gen_random_uuid(); mid:=gen_random_uuid(); cid:=gen_random_uuid(); aid:=gen_random_uuid();
  digits:=lpad((('x'||substr(replace(uid::text,'-',''),1,10))::bit(40)::bigint)::text,13,'0');
  starts:=current_date;
  if label='expires_today' then
   select d::date into starts from generate_series(
    (current_date - interval '1 year' - interval '3 days')::timestamp,
    (current_date - interval '1 year' + interval '3 days')::timestamp, interval '1 day') d
    where (d + interval '1 year' - interval '1 day')::date=current_date limit 1;
   if starts is null then raise exception 'Fixture could not find inclusive expiry date'; end if;
  elsif label='expired_yesterday' then
   select d::date into starts from generate_series(
    (current_date - interval '1 year' - interval '3 days')::timestamp,
    (current_date - interval '1 year' + interval '3 days')::timestamp, interval '1 day') d
    where (d + interval '1 year' - interval '1 day')::date=current_date-1 limit 1;
   if starts is null then raise exception 'Fixture could not find yesterday expiry'; end if;
  elsif label='future' then starts:=current_date+1;
  elsif label='expired' then starts:=(current_date-interval '2 years')::date;
  end if;
  ends:=(starts+interval '1 year'-interval '1 day')::date;
  visible:=label not in ('future','expired','expired_yesterday','inactive_assignment','inactive_committee','private_committee','pending_member');
  committee_kind:=case when label='advisory' then 'central_advisory' else 'central' end;
  insert into auth.users(id,email,raw_user_meta_data) values(uid,uid::text||'@example.invalid','{}');
  insert into public.members(id,user_id,full_name,father_name,cnic,mobile,district,address,photo_url,declaration_accepted,status)
   values(mid,uid,'P05 '||label,'Test Parent',substr(digits,1,5)||'-'||substr(digits,6,7)||'-'||substr(digits,13,1),
    '03001234567','Umerkot','Local P05 fixture',uid::text||'/p05.jpg',true,
    (case when label='pending_member' then 'pending' else 'approved' end)::public.member_status);
  insert into public.organization_committees(id,committee_type,name,status,public_display,tenure_start,tenure_end)
   values(cid,committee_kind,'P05 '||label,
    case when label='inactive_committee' then 'suspended' else 'active' end,
    label<>'private_committee',
    case when label='legacy_created_start' then null else current_date end,
    (current_date+interval '5 years')::date);
  insert into public.organization_committee_members(id,committee_id,member_id,designation_title,full_name_snapshot,status,tenure_start,created_at)
   values(aid,cid,mid,'P05 Test Designation','P05 '||label,
    case when label='inactive_assignment' then 'suspended' else 'active' end,starts,now());
  key:='JAS-OB-'||extract(year from now())::int||'-'||upper(left(replace(aid::text,'-',''),8));
  insert into p05_cases values(label,aid,key,uid::text||'/p05.jpg',visible,starts,ends);
 end loop;
end $$;

-- Simulate legacy null dates without changing the production trigger contract.
alter table public.organization_committee_members disable trigger set_designation_assignment_validity_before_write;
update public.organization_committee_members set tenure_start=null,tenure_end=null
 where id in (select assignment_id from p05_cases where name in ('legacy_committee_start','legacy_created_start'));
update public.organization_committee_members set tenure_end=null
 where id=(select assignment_id from p05_cases where name='missing_end');
update public.organization_committee_members set tenure_end=(current_date+interval '5 years')::date
 where id=(select assignment_id from p05_cases where name='long_committee_end');
alter table public.organization_committee_members enable trigger set_designation_assignment_validity_before_write;

create function pg_temp.p05_assert_directory() returns void language plpgsql as $$
declare c record; actual jsonb; n int; keys text[];
begin
 for c in select * from p05_cases order by name loop
  select count(*) into n from public.get_public_designation_holders() h where h.public_key=c.public_key;
  if n <> (case when c.visible then 1 else 0 end) then
   raise exception 'FAIL [%] %: expected visibility %, got % rows',current_user,c.name,c.visible,n;
  end if;
  if c.visible then
   select to_jsonb(h) into actual from public.get_public_designation_holders() h where h.public_key=c.public_key;
   if actual->>'tenure_start' is distinct from c.expected_start::text or
      actual->>'tenure_end' is distinct from c.expected_end::text then
    raise exception 'FAIL [%] %: incorrect returned dates %',current_user,c.name,actual;
   end if;
   select array_agg(k order by k) into keys from jsonb_object_keys(actual) k;
   if keys is distinct from array[
    'assigned_at','committee_name','designation_title','district','division','father_name',
    'full_name','level','level_label','member_no','photo_url','public_key','sort_order','taluka','tenure_end','tenure_start'
   ]::text[] then raise exception 'FAIL changed public response keys: %',keys; end if;
   if actual->>'full_name' is distinct from 'P05 '||c.name then raise exception 'FAIL identity'; end if;
   if c.name='advisory' and (actual->>'level_label' is distinct from 'Advisory' or actual->>'level' is distinct from 'central_advisory') then
    raise exception 'FAIL advisory compatibility'; end if;
  end if;
  raise notice 'PASS [%] %',current_user,c.name;
 end loop;
end $$;
grant execute on function pg_temp.p05_assert_directory() to anon,authenticated;

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select pg_temp.p05_assert_directory();
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','',true);
select pg_temp.p05_assert_directory();
reset role;

do $$
declare c record;
begin
 -- Same eligibility rule as the existing photo-access helper, for each fixture.
 for c in select * from p05_cases loop
  if app_private.member_photo_is_public_designation_holder(c.photo_path) is distinct from c.visible then
   raise exception 'FAIL photo eligibility mismatch: %',c.name;
  end if;
 end loop;
 if (select approve_def from p05_before) is distinct from pg_get_functiondef('public.approve_member(uuid,uuid)'::regprocedure)
 then raise exception 'FAIL review definition changed'; end if;
 if (select counters from p05_before) is distinct from
 (select coalesce(jsonb_agg(to_jsonb(counter_row) order by counter_row.year),'[]'::jsonb) from public.member_counters counter_row)
 then raise exception 'FAIL counter changed'; end if;
 raise notice 'PASS photo eligibility and membership counter/review preservation';
end $$;
rollback;
\echo 'P0.5 directory validity regression: PASS (fixtures rolled back)'
