-- Run only on local/staging after all migrations. This transaction rolls back its fixtures.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('b2000000-0000-4000-8000-000000000001','p02-applicant@example.invalid','{}'),
 ('b2000000-0000-4000-8000-000000000002','p02-other@example.invalid','{}'),
 ('b2000000-0000-4000-8000-000000000003','p02-admin@example.invalid','{}'),
 ('b2000000-0000-4000-8000-000000000004','p02-scoped@example.invalid','{}');
insert into public.user_roles(user_id,role) values
 ('b2000000-0000-4000-8000-000000000003','super_admin'),
 ('b2000000-0000-4000-8000-000000000004','membership_admin');
insert into public.admin_area_permissions(user_id,module_key,scope,district,can_view,can_review,can_approve,is_active)
values ('b2000000-0000-4000-8000-000000000004','membership','district','Karachi',true,true,true,true);
insert into storage.objects(bucket_id,name,metadata) values
 ('member-photos','b2000000-0000-4000-8000-000000000001/photo.jpg','{"mimetype":"image/jpeg","size":1000}'),
 ('membership-receipts','b2000000-0000-4000-8000-000000000001/receipt.jpg','{"mimetype":"image/jpeg","size":1000}'),
 ('membership-receipts','b2000000-0000-4000-8000-000000000002/receipt.jpg','{"mimetype":"image/jpeg","size":1000}');
create temp table p02_state(member_id uuid, payment_id uuid);
grant all on p02_state to authenticated,service_role;
set local role authenticated;
select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $$
declare payload jsonb := '{"full_name":"P02 Applicant","father_name":"Test Parent","cnic":"44404-9886551-3","mobile":"03001234567","district":"Umerkot","taluka":"Kunri","address":"Staging test","declaration_accepted":true,"photo_url":"b2000000-0000-4000-8000-000000000001/photo.jpg"}';
  member_uuid uuid; payment_uuid uuid; denied boolean;
begin
  -- 1) No receipt: no partial member insert.
  denied := false;
  begin perform public.submit_membership_application_500(payload); exception when others then denied:=true; end;
  if not denied or exists(select 1 from public.members where user_id=auth.uid()) then raise exception 'FAIL receipt requirement/atomic rollback'; end if;
  -- 2) Another user's receipt is rejected.
  denied:=false;
  begin perform public.submit_membership_application_500(payload,'{"receipt_path":"b2000000-0000-4000-8000-000000000002/receipt.jpg"}'); exception when others then denied:=true; end;
  if not denied then raise exception 'FAIL cross-user receipt'; end if;
  -- 3) Client protected fields cannot disable fee enforcement.
  denied:=false;
  begin perform public.submit_membership_application_500(payload||'{"membership_fee_required":false}','{"receipt_path":"b2000000-0000-4000-8000-000000000001/receipt.jpg"}'); exception when others then denied:=true; end;
  if not denied then raise exception 'FAIL protected payload'; end if;
  -- 4) Success and retry: exactly one member and fee record at PKR 500 pending.
  member_uuid:=public.submit_membership_application_500(payload,'{"receipt_path":"b2000000-0000-4000-8000-000000000001/receipt.jpg"}');
  if member_uuid is distinct from public.submit_membership_application_500(payload) then raise exception 'FAIL retry identity'; end if;
  select id into payment_uuid from public.membership_payments where member_id=member_uuid;
  if not exists(select 1 from public.membership_payments where id=payment_uuid and base_amount=500 and tax_amount=0 and total_amount=500 and status='pending') then raise exception 'FAIL canonical fee'; end if;
  if (select count(*) from public.membership_payments where member_id=member_uuid)<>1 then raise exception 'FAIL duplicate fee'; end if;
  insert into p02_state values(member_uuid,payment_uuid);
  -- 5) A client cannot mark its payment paid or change the amount.
  denied:=false;
  begin update public.membership_payments set status='paid',total_amount=1 where id=payment_uuid; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'FAIL client payment mutation'; end if;
  -- 6) Service-only review RPC is not available to authenticated users.
  denied:=false;
  begin perform public.review_membership_payment_500(member_uuid,auth.uid(),'paid'); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'FAIL reviewer execute grant'; end if;
end $$;
reset role;

-- Isolated LOCAL test database only: lock counters/members and roll back all changes.
-- Existing data must not already use the target boundary IDs.
lock table public.members in share row exclusive mode;
lock table public.member_counters in exclusive mode;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
do $$
declare y int := extract(year from now())::int; template public.members;
 r public.members; uid uuid; mid uuid; n int; actual text; expected text;
 reviewer uuid := 'b2000000-0000-4000-8000-000000000003';
 before_members jsonb;
begin
 if exists(select 1 from public.members where member_no in (
 'JAS-'||y||'-0001','JAS-'||y||'-0999','JAS-'||y||'-1000','JAS-'||y||'-9999','JAS-'||y||'-10000','JAS-'||y||'-10001')) then
 raise exception 'Use a disposable local database without boundary fixtures'; end if;
 select * into template from public.members where id=(select member_id from p02_state);
 select coalesce(jsonb_object_agg(id::text,member_no),'{}'::jsonb) into before_members from public.members;
 -- First issue 1000, then keep it present while crossing 9999 -> 10000 -> 10001.
 foreach n in array array[1,999,1000,9999,10000,10001] loop
  uid:=gen_random_uuid(); mid:=gen_random_uuid();
  insert into auth.users(id,email,raw_user_meta_data) values(uid,uid::text||'@example.invalid','{}');
  r:=template; r.id:=mid; r.user_id:=uid; r.cnic:='99999-'||lpad(n::text,7,'0')||'-1';
  r.member_no:=null; r.status:='pending'; r.reviewed_by:=null; r.reviewed_at:=null; r.approved_at:=null;
  insert into public.members select r.*;
  insert into public.membership_payments(member_id,user_id,status,admin_note)
   values(mid,uid,'waived','P04 test waiver');
  if n in (1,999,1000,9999) then
   insert into public.member_counters(year,last_seq) values(y,n-1)
    on conflict(year) do update set last_seq=excluded.last_seq;
  end if;
  select * into r from public.approve_member(mid,reviewer);
  expected:='JAS-'||y||'-'||case n
   when 1 then '0001'
   when 999 then '0999'
   when 1000 then '1000'
   when 9999 then '9999'
   when 10000 then '10000'
   when 10001 then '10001'
  end;
  if r.member_no is distinct from expected then raise exception 'FAIL expected %, got %',expected,r.member_no; end if;
  if r.status<>'approved' or r.reviewed_by<>reviewer then raise exception 'FAIL review state'; end if;
  if not exists(select 1 from public.audit_logs where entity_table='members' and entity_id=mid
    and actor_user_id=reviewer and new_data->>'status'='approved') then raise exception 'FAIL audit actor'; end if;
  begin
   perform public.approve_member(mid,reviewer);
   raise exception 'FAIL duplicate approval accepted';
  exception when sqlstate 'P0001' then
   if SQLERRM='FAIL duplicate approval accepted' then raise; end if;
  end;
  raise notice 'PASS approval %',expected;
 end loop;
 if exists(select 1 from public.members m where before_members ? m.id::text
   and to_jsonb(m.member_no) is distinct from before_members->m.id::text) then
   -- JSON null and SQL null compare equivalently after coalesce.
   if exists(select 1 from public.members m where before_members ? m.id::text
    and coalesce(to_jsonb(m.member_no),'null'::jsonb) is distinct from before_members->m.id::text) then
    raise exception 'FAIL existing member number changed'; end if;
 end if;
 if (select last_seq from public.member_counters where year=y)<>10001 then raise exception 'FAIL counter'; end if;
end $$;
rollback;
