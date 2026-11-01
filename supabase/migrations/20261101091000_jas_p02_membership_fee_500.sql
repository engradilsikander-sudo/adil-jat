-- New applications: PKR 500, no tax. Historical applications/payments keep their terms.
begin;
alter table public.members add column membership_fee_required boolean not null default false;
alter table public.members alter column membership_fee_required set default true;
alter table public.membership_payments alter column base_amount set default 500,
  alter column tax_amount set default 0, alter column total_amount set default 500;

-- Lock pricing/ownership and verify that receipt metadata refers to an actual private object.
create or replace function app_private.validate_membership_receipt(_owner uuid, _receipt jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare obj storage.objects; p text := _receipt->>'receipt_path'; mime text; bytes bigint;
begin
  if p is null or left(p,length(_owner::text)+1) <> _owner::text||'/' or p like '%..%' then
    raise exception 'Receipt must belong to this member.';
  end if;
  select * into obj from storage.objects where bucket_id='membership-receipts' and name=p;
  if obj.id is null then raise exception 'Upload a payment receipt before submitting.'; end if;
  mime := obj.metadata->>'mimetype'; bytes := (obj.metadata->>'size')::bigint;
  if mime is null or mime not in ('image/png','image/jpeg','image/webp','application/pdf')
    or bytes is null or bytes <= 0 or bytes > 5242880 then
    raise exception 'Receipt must be PNG, JPG, WebP or PDF, up to 5MB.';
  end if;
  return jsonb_build_object('receipt_path',p,
    'receipt_file_name',left(coalesce(nullif(_receipt->>'receipt_file_name',''),'Receipt'),255),
    'receipt_mime_type',mime,'receipt_size_bytes',bytes,'receipt_uploaded_at',now());
end $$;
revoke all on function app_private.validate_membership_receipt(uuid,jsonb) from public,anon,authenticated;

create or replace function public.guard_membership_fee_terms()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then new.membership_fee_required := true;
  else
    new.membership_fee_required := old.membership_fee_required;
    if new.status='approved' and old.status is distinct from new.status and old.membership_fee_required then
      -- Lock the payment row so approval cannot race a payment status change.
      perform 1 from public.membership_payments where member_id=old.id and status in ('paid','waived') for update;
      if not found then raise exception 'Verify or waive the membership fee before approval.'; end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_membership_fee_terms() from public,anon,authenticated;
create trigger p02_membership_fee_terms before insert or update on public.members
  for each row execute function public.guard_membership_fee_terms();

create or replace function public.guard_membership_payment_terms()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.members;
begin
  select * into m from public.members where id=new.member_id;
  if m.id is null or m.user_id <> new.user_id then raise exception 'Payment ownership does not match member.'; end if;
  if tg_op='INSERT' then
    if new.base_amount <> 500 or new.tax_amount <> 0 or new.total_amount <> 500 or new.currency <> 'PKR' then
      raise exception 'New membership payments must total PKR 500 with no tax.';
    end if;
  elsif (new.member_id,new.user_id,new.base_amount,new.tax_amount,new.total_amount,new.currency)
    is distinct from (old.member_id,old.user_id,old.base_amount,old.tax_amount,old.total_amount,old.currency) then
    raise exception 'Historical payment ownership and amounts cannot be changed.';
  end if;
  -- Only the service-role reviewer RPC can verify/waive/refund a payment.
  if coalesce(auth.role(),'') <> 'service_role' then
    if new.user_id is distinct from auth.uid() or new.status <> 'pending'
      or (tg_op='INSERT' and (new.admin_note is not null or new.paid_at is not null))
      or (tg_op='UPDATE' and (new.admin_note is distinct from old.admin_note or new.paid_at is distinct from old.paid_at)) then
      raise exception 'Only authorized reviewers can verify membership payments.';
    end if;
    if tg_op='UPDATE' and old.status not in ('pending','failed') then raise exception 'This payment is locked.'; end if;
  end if;
  if new.receipt_path is not null and (tg_op='INSERT' or new.receipt_path is distinct from old.receipt_path) then
    perform app_private.validate_membership_receipt(new.user_id,to_jsonb(new));
  end if;
  return new;
end $$;
revoke all on function public.guard_membership_payment_terms() from public,anon,authenticated;
create trigger p02_membership_payment_terms before insert or update on public.membership_payments
  for each row execute function public.guard_membership_payment_terms();

-- Applicants can only read their own fee record. Mutations run through the atomic RPC below.
drop policy if exists membership_payments_insert_own on public.membership_payments;
drop policy if exists membership_payments_update_own_pending_receipt on public.membership_payments;
drop policy if exists membership_payments_insert_membership_admin on public.membership_payments;
drop policy if exists membership_payments_update_membership_admin on public.membership_payments;
drop policy if exists membership_payments_select_membership_admin on public.membership_payments;
revoke insert,update,delete on public.membership_payments from authenticated;
grant select on public.membership_payments to authenticated;
create policy membership_payments_select_scoped_admin on public.membership_payments for select to authenticated
using (exists(select 1 from public.members m where m.id=member_id
  and public.current_user_can_access_membership_area(m.district,m.taluka,'view')));

-- Require scoped admin access for private receipts; never broaden applicant object access.
drop policy if exists "membership_receipts_select_own_or_membership_admin" on storage.objects;
create policy "membership_receipts_select_own_or_membership_admin" on storage.objects for select to authenticated
using (bucket_id='membership-receipts' and ((storage.foldername(name))[1]=auth.uid()::text or exists (
  select 1 from public.members m where m.user_id::text=(storage.foldername(name))[1]
    and public.current_user_can_access_membership_area(m.district,m.taluka,'view'))));
drop policy if exists "membership_receipts_insert_own" on storage.objects;
create policy "membership_receipts_insert_own" on storage.objects for insert to authenticated
with check (bucket_id='membership-receipts' and ((storage.foldername(name))[1]=auth.uid()::text or exists (
  select 1 from public.members m where m.user_id::text=(storage.foldername(name))[1]
    and public.current_user_can_access_membership_area(m.district,m.taluka,'review'))));
-- Receipts are immutable objects: replacement uploads get a new path. Preserve paid evidence.
drop policy if exists "membership_receipts_update_own_or_membership_admin" on storage.objects;
drop policy if exists "membership_receipts_delete_own_or_membership_admin" on storage.objects;

create or replace function public.submit_membership_application_500(_payload jsonb, _receipt jsonb default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid := auth.uid(); m public.members; r public.members; pay public.membership_payments; rec jsonb; saved uuid; fee_required boolean;
  allowed text[] := array['full_name','father_name','cnic','mobile','district','taluka','profession','caste_branch',
    'address','date_of_birth','gender','education','blood_group','emergency_contact_name',
    'emergency_contact_relation','emergency_contact_mobile','declaration_accepted','photo_url'];
begin
  if uid is null or auth.role() is distinct from 'authenticated' then raise exception 'Login required.'; end if;
  if _payload is null or jsonb_typeof(_payload)<>'object'
    or exists(select 1 from jsonb_object_keys(_payload) k where not k=any(allowed)) then
    raise exception 'Invalid application fields.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into m from public.members where user_id=uid for update;
  if m.status='approved' then raise exception 'Approved membership is locked.'; end if;
  r := jsonb_populate_record(null::public.members,_payload);
  if nullif(trim(r.full_name),'') is null or nullif(trim(r.father_name),'') is null
    or nullif(trim(r.cnic),'') is null or nullif(trim(r.mobile),'') is null
    or nullif(trim(r.district),'') is null or nullif(trim(r.address),'') is null
    or r.declaration_accepted is distinct from true then raise exception 'Complete the required application fields and declaration.'; end if;
  if r.photo_url is null or left(r.photo_url,length(uid::text)+1) <> uid::text||'/'
    or not exists(select 1 from storage.objects where bucket_id='member-photos' and name=r.photo_url) then
    raise exception 'Upload your membership photo first.';
  end if;
  select * into pay from public.membership_payments where member_id=m.id for update;
  if pay.id is not null and pay.status in ('cancelled','refunded') then raise exception 'Contact an administrator about this payment before resubmitting.'; end if;
  fee_required := m.id is null or m.membership_fee_required or pay.id is not null;
  if fee_required and (pay.status is null or pay.status not in ('paid','waived')) then
    if _receipt is not null then rec := app_private.validate_membership_receipt(uid,_receipt);
    elsif pay.receipt_path is not null then rec := app_private.validate_membership_receipt(uid,to_jsonb(pay));
    else raise exception 'Upload the membership payment receipt before submitting.';
    end if;
  end if;
  if m.id is null then
    insert into public.members(user_id,full_name,father_name,cnic,mobile,district,taluka,profession,caste_branch,
      address,date_of_birth,gender,education,blood_group,emergency_contact_name,emergency_contact_relation,
      emergency_contact_mobile,declaration_accepted,photo_url,status)
    values(uid,r.full_name,r.father_name,r.cnic,r.mobile,r.district,r.taluka,r.profession,r.caste_branch,
      r.address,r.date_of_birth,r.gender,r.education,r.blood_group,r.emergency_contact_name,r.emergency_contact_relation,
      r.emergency_contact_mobile,true,r.photo_url,'pending') returning id into saved;
  else
    update public.members set full_name=r.full_name,father_name=r.father_name,cnic=r.cnic,mobile=r.mobile,
      district=r.district,taluka=r.taluka,profession=r.profession,caste_branch=r.caste_branch,address=r.address,
      date_of_birth=r.date_of_birth,gender=r.gender,education=r.education,blood_group=r.blood_group,
      emergency_contact_name=r.emergency_contact_name,emergency_contact_relation=r.emergency_contact_relation,
      emergency_contact_mobile=r.emergency_contact_mobile,declaration_accepted=true,photo_url=r.photo_url,
      status='pending',rejection_reason=null where id=m.id returning id into saved;
  end if;
  if pay.id is null and fee_required then
    insert into public.membership_payments(member_id,user_id,base_amount,tax_amount,total_amount,currency,
      status,payment_method,receipt_path,receipt_file_name,receipt_mime_type,receipt_size_bytes,receipt_uploaded_at)
    values(saved,uid,500,0,500,'PKR','pending','bank',rec->>'receipt_path',rec->>'receipt_file_name',
      rec->>'receipt_mime_type',(rec->>'receipt_size_bytes')::bigint,now());
  elsif pay.status in ('pending','failed') then
    update public.membership_payments set status='pending',receipt_path=rec->>'receipt_path',
      receipt_file_name=rec->>'receipt_file_name',receipt_mime_type=rec->>'receipt_mime_type',
      receipt_size_bytes=(rec->>'receipt_size_bytes')::bigint,receipt_uploaded_at=now() where id=pay.id;
  end if;
  return saved;
end $$;
revoke all on function public.submit_membership_application_500(jsonb,jsonb) from public,anon;
grant execute on function public.submit_membership_application_500(jsonb,jsonb) to authenticated;

-- Server-only, area-checked and atomic reviewer updates. Attribution uses P0.1's audit mechanism.
create or replace function public.review_membership_payment_500(_member_id uuid, _reviewer uuid,
  _status public.membership_payment_status default null, _note text default null, _receipt jsonb default null, _payment_id uuid default null)
returns public.membership_payments language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.members; pay public.membership_payments; rec jsonb;
begin
  if auth.role() is distinct from 'service_role' or _reviewer is null then raise exception 'Server reviewer required.'; end if;
  select * into m from public.members where id=_member_id for update;
  if m.id is null then raise exception 'Member not found.'; end if;
  if not exists(select 1 from public.user_roles where user_id=_reviewer and role::text in ('admin','super_admin','membership_admin'))
    or not app_private.user_can_access_area_module(_reviewer,'membership',m.district,m.taluka,
      case when _status in ('paid','waived','refunded') then 'approve' else 'review' end) then
    raise exception 'Reviewer does not have membership payment access for this area.';
  end if;
  perform set_config('app.audit_actor_user_id',_reviewer::text,true);
  select * into pay from public.membership_payments where member_id=m.id for update;
  if _payment_id is not null and pay.id is distinct from _payment_id then raise exception 'Payment identity changed. Please refresh.'; end if;
  if _receipt is not null then
    if pay.status is not null and pay.status not in ('pending','failed') then raise exception 'This payment receipt is locked.'; end if;
    rec := app_private.validate_membership_receipt(m.user_id,_receipt);
    if pay.id is null then
      insert into public.membership_payments(member_id,user_id,base_amount,tax_amount,total_amount,status,payment_method,
        receipt_path,receipt_file_name,receipt_mime_type,receipt_size_bytes,receipt_uploaded_at)
      values(m.id,m.user_id,500,0,500,'pending','bank',rec->>'receipt_path',rec->>'receipt_file_name',
        rec->>'receipt_mime_type',(rec->>'receipt_size_bytes')::bigint,now()) returning * into pay;
    else
      update public.membership_payments set status='pending',receipt_path=rec->>'receipt_path',
        receipt_file_name=rec->>'receipt_file_name',receipt_mime_type=rec->>'receipt_mime_type',
        receipt_size_bytes=(rec->>'receipt_size_bytes')::bigint,receipt_uploaded_at=now()
        where id=pay.id returning * into pay;
    end if;
  else
    if pay.id is null or _status is null then raise exception 'Payment and status required.'; end if;
    if _status='paid' then perform app_private.validate_membership_receipt(m.user_id,to_jsonb(pay)); end if;
    if _status in ('waived','refunded') and nullif(trim(_note),'') is null then raise exception 'An admin note is required for waivers and refunds.'; end if;
    if m.status='approved' and _status not in ('paid','waived') then raise exception 'Approved membership payment is locked; use a documented correction process.'; end if;
    update public.membership_payments set status=_status,admin_note=left(_note,3000),
      paid_at=case when _status in ('paid','waived') then coalesce(paid_at,now()) else null end
      where id=pay.id returning * into pay;
  end if;
  return pay;
end $$;
revoke all on function public.review_membership_payment_500(uuid,uuid,public.membership_payment_status,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.review_membership_payment_500(uuid,uuid,public.membership_payment_status,text,jsonb,uuid) to service_role;
-- Audit each payment mutation inside its transaction; do not rely on a second browser/server write.
drop trigger if exists audit_log_changes on public.membership_payments;
create trigger audit_log_changes after insert or update or delete on public.membership_payments
  for each row execute function public.write_audit_log();
notify pgrst, 'reload schema';
commit;
