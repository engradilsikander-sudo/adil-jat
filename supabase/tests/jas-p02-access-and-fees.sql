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
-- 13) Other members cannot read someone else's fee, and cannot see private finance.
set local role authenticated;
select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $$ begin
  if exists(select 1 from public.membership_payments where member_id=(select member_id from p02_state)) then raise exception 'FAIL cross-user fee read'; end if;
  if exists(select 1 from storage.objects where name='b2000000-0000-4000-8000-000000000001/receipt.jpg') then raise exception 'FAIL private receipt read'; end if;
  if exists(select 1 from public.finance_donations) then raise exception 'FAIL ordinary member finance read'; end if;
end $$;
reset role;
-- 14) Table grants exist, but do not accidentally grant client writes on internal queues.
do $$ declare t text; begin
  foreach t in array array['program_applications','program_documents','program_admin_assignments','organization_committees','organization_designations','organization_committee_members','finance_donations','finance_expenses','cms_pages'] loop
    if not has_table_privilege('authenticated',format('public.%I',t),'SELECT') then raise exception 'FAIL grant on %',t; end if;
  end loop;
  if has_table_privilege('authenticated','public.notification_email_deliveries','UPDATE') then raise exception 'FAIL internal queue writable'; end if;
  if has_table_privilege('anon','public.membership_payments','SELECT') then raise exception 'FAIL public membership payments'; end if;
end $$;
-- 15) Real non-empty fixtures for program, finance, organization and public CMS RLS.
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
insert into public.program_applications(program_key,applicant_user_id,membership_no,applicant_name,phone,district,taluka,details)
select 'health','b2000000-0000-4000-8000-000000000001',m.member_no,'P02 Health Case','03001234567',d,'Kunri',
  '{"case_priority":"urgent","disease_name":"PRIVATE DIAGNOSIS","doctor_contact":"PRIVATE PHONE","case_close_report":"PRIVATE REPORT","payment_status":"pending"}'
from public.members m cross join (values('Umerkot'),('Karachi')) districts(d) where m.id=(select member_id from p02_state);
insert into public.finance_donations(donor_name,amount,payment_method,purpose,district,status)
values('P02 Donor',500,'bank','general_fund','Umerkot','approved');
insert into public.user_roles(user_id,role) values('b2000000-0000-4000-8000-000000000004','health_admin');
insert into public.admin_area_permissions(user_id,module_key,scope,district,can_view,can_review,can_approve,is_active)
values('b2000000-0000-4000-8000-000000000004','health','district','Umerkot',true,false,false,true);
insert into public.organization_committees(id,committee_type,name,public_display,notes)
values('b2000000-0000-4000-8000-000000000011','central','P02 Public Committee',true,'PRIVATE INTERNAL NOTE'),
('b2000000-0000-4000-8000-000000000012','central','P02 Hidden Committee',false,'PRIVATE INTERNAL NOTE');
insert into public.organization_committee_members(committee_id,member_id,designation_title,full_name_snapshot,tenure_start)
select 'b2000000-0000-4000-8000-000000000011',member_id,'Test Officer','P02 Public Officer',current_date from p02_state;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000004',true);
do $$ declare denied boolean:=false; begin
  if (select count(*) from public.health_application_summaries where applicant_name='P02 Health Case')<>1 then raise exception 'FAIL health area scoping'; end if;
  if exists(select 1 from public.health_application_summaries where details ?| array['disease_name','doctor_contact','case_close_report']) then raise exception 'FAIL clinical payload in summary'; end if;
  if exists(select 1 from public.finance_donations where donor_name='P02 Donor') then raise exception 'FAIL cross-module finance read'; end if;
  begin update public.program_applications set admin_remarks='unauthorized edit' where applicant_name='P02 Health Case'; exception when others then denied:=true; end;
  -- RLS may suppress updates instead of raising; either way the row must stay unchanged.
  if exists(select 1 from public.program_applications where admin_remarks='unauthorized edit') then raise exception 'FAIL view-only admin update'; end if;
end $$;
select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000003',true);
do $$ begin
  if (select count(*) from public.health_application_summaries where applicant_name='P02 Health Case')<>2 then raise exception 'FAIL global admin program read'; end if;
  if not exists(select 1 from public.finance_donations where donor_name='P02 Donor') then raise exception 'FAIL global finance read'; end if;
  if not exists(select 1 from public.organization_committees where name='P02 Hidden Committee') then raise exception 'FAIL admin organization read'; end if;
end $$;
select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists(select 1 from public.program_applications where applicant_name='P02 Health Case') then raise exception 'FAIL other member program read'; end if;
  if exists(select 1 from public.organization_committee_members where full_name_snapshot='P02 Public Officer') then raise exception 'FAIL raw public assignment exposure'; end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claim.role','anon',true);
do $$ declare directory jsonb; denied boolean:=false; begin
  directory:=public.get_public_committee_directory('b2000000-0000-4000-8000-000000000011');
  if jsonb_array_length(directory)<>1 then raise exception 'FAIL public committee read'; end if;
  if directory::text like '%PRIVATE INTERNAL NOTE%' or directory::text like '%"member_id"%' then raise exception 'FAIL private public-directory data'; end if;
  if directory->0->'members'->0->>'id' not like 'JAS-OB-%' then raise exception 'FAIL public card key'; end if;
  if public.get_public_committee_directory('b2000000-0000-4000-8000-000000000012')<>'[]'::jsonb then raise exception 'FAIL hidden public committee'; end if;
  if exists(select 1 from public.cms_pages where status<>'published') then raise exception 'FAIL unpublished public CMS'; end if;
  begin perform 1 from public.program_applications; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'FAIL anonymous program grant'; end if;
end $$;
reset role;
-- 16) Restored INSERT grants do not permit applicant-side administrative decisions.
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000001',true);
do $$ declare denied boolean:=false; begin
  begin
    insert into public.program_applications(program_key,applicant_user_id,membership_no,applicant_name,phone,status,approved_amount)
    select 'health',auth.uid(),member_no,'P02 Crafted Case','03001234567','approved',500 from public.members where id=(select member_id from p02_state);
  exception when others then denied:=true; end;
  if not denied then raise exception 'FAIL crafted approved application insert'; end if;
  denied:=false;
  begin
    insert into public.program_documents(application_id,program_key,uploaded_by,document_type,file_path,verification_status,is_verified)
    select id,'health',auth.uid(),'medical_reports',auth.uid()::text||'/forged.jpg','verified',true from public.program_applications where applicant_name='P02 Health Case' limit 1;
  exception when others then denied:=true; end;
  if not denied then raise exception 'FAIL crafted verified document insert'; end if;
end $$;
reset role;
-- 17) A review-only finance admin cannot insert a pre-approved donation.
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub','',true);
insert into public.user_roles(user_id,role) values('b2000000-0000-4000-8000-000000000004','finance_admin');
insert into public.admin_area_permissions(user_id,module_key,scope,district,can_view,can_review,can_approve,is_active)
values('b2000000-0000-4000-8000-000000000004','finance','district','Umerkot',true,true,false,true);
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000004',true);
do $$ declare denied boolean:=false; begin
  insert into public.finance_donations(donor_name,amount,payment_method,purpose,district,status)
  values('P02 Review Only',500,'bank','general_fund','Umerkot','pending');
  begin
    insert into public.finance_donations(donor_name,amount,payment_method,purpose,district,status)
    values('P02 Crafted Donation',500,'bank','general_fund','Umerkot','approved');
  exception when others then denied:=true; end;
  if not denied then raise exception 'FAIL review-only financial approval'; end if;
end $$;
reset role;
rollback;


