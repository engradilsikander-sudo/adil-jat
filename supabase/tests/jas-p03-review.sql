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
-- 7) Trigger stops approval before verified fee, including service-side calls.
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
do $$ declare denied boolean:=false; begin
  begin perform public.approve_member((select member_id from p02_state),'b2000000-0000-4000-8000-000000000003'); exception when others then denied:=true; end;
  if not denied then raise exception 'FAIL unverified fee approved'; end if;
end $$;
set local role service_role;
do $$ declare denied boolean; m uuid; p uuid; before_count integer; begin
  select member_id,payment_id into m,p from p02_state;
  -- 8) Scoped reviewer cannot verify an out-of-area member.
  denied:=false;
  begin perform public.review_membership_payment_500(m,'b2000000-0000-4000-8000-000000000004','paid',null,null,p); exception when others then denied:=true; end;
  if not denied then raise exception 'FAIL out-of-area payment verification'; end if;
  -- 9) Reject stale/wrong identity before mutation.
  denied:=false;
  begin perform public.review_membership_payment_500(m,'b2000000-0000-4000-8000-000000000003','paid',null,null,gen_random_uuid()); exception when others then denied:=true; end;
  if not denied then raise exception 'FAIL stale payment identity'; end if;
  -- 10) Waiver requires a note.
  denied:=false;
  begin perform public.review_membership_payment_500(m,'b2000000-0000-4000-8000-000000000003','waived'); exception when others then denied:=true; end;
  if not denied then raise exception 'FAIL waiver without note'; end if;
  -- Pricing cannot be altered even through a privileged direct update.
  denied:=false;
  begin update public.membership_payments set base_amount=1,total_amount=1 where id=p; exception when others then denied:=true; end;
  if not denied then raise exception 'FAIL service-side pricing guard'; end if;
  -- 11) Global reviewer verifies valid evidence and then approves.
  perform public.review_membership_payment_500(m,'b2000000-0000-4000-8000-000000000003','paid',null,null,p);
  perform public.approve_member(m,'b2000000-0000-4000-8000-000000000003');
end $$;
reset role;
-- 12) Exactly one attributed audit event for payment verification.
do $$ begin
  if (select count(*) from public.audit_logs where entity_table='membership_payments' and entity_id=(select payment_id from p02_state)
    and action='update' and new_data->>'status'='paid' and actor_user_id='b2000000-0000-4000-8000-000000000003')<>1 then raise exception 'FAIL atomic reviewer audit'; end if;
end $$;

-- P03: reviewed record and invalid actors fail closed.
set local role service_role;
do $$ declare m uuid; denied boolean; begin
 select member_id into m from p02_state;
 begin perform public.reject_member(m,'Concurrent loser','b2000000-0000-4000-8000-000000000003');
 raise exception 'FAIL stale review accepted'; exception when sqlstate 'P0001' then
 if SQLERRM='FAIL stale review accepted' then raise; end if; end;
 begin perform public.approve_member(m,null); raise exception 'FAIL null reviewer';
 exception when insufficient_privilege then null; end;
 begin perform public.approve_member(m,'b2000000-0000-4000-8000-000000000002'); raise exception 'FAIL ordinary reviewer';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
