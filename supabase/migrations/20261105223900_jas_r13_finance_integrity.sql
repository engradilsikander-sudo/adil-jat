-- JAS R1.3: finance status integrity, authoritative audit and replay-safe admin operations.
-- Forward-only. Never backfills or removes financial records or old audit history.
-- Must be applied AFTER R1.1 (20261105145312) and R1.2 (20261105210216).
begin;

-- Keep request tokens private; request replay is permitted only through checked RPCs.
create table public.finance_operation_keys (
  idempotency_key uuid primary key,
  actor_user_id uuid not null,
  operation text not null check (operation in ('create','decide')),
  entity_type text not null check (entity_type in ('finance_donations','finance_expenses')),
  entity_id uuid not null,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index finance_operation_keys_entity_idx on public.finance_operation_keys (entity_type,entity_id,created_at);
alter table public.finance_operation_keys enable row level security;
revoke all on public.finance_operation_keys from public, anon, authenticated;
grant all on public.finance_operation_keys to service_role;

-- A finance row's business fields cannot silently change after initial insertion.
-- All status changes must follow the declared one-way state machine. Actor/times
-- are always derived from request authentication, never accepted from a browser.
create function app_private.r13_finance_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid());
        old_business jsonb;
        new_business jsonb;
begin
  old_business := to_jsonb(old) - array['status','approved_by','approved_at','rejected_by','rejected_at','paid_by','paid_at','updated_at'];
  new_business := to_jsonb(new) - array['status','approved_by','approved_at','rejected_by','rejected_at','paid_by','paid_at','updated_at'];
  if old_business is distinct from new_business then
    raise exception 'finance_immutable_record' using errcode='23514';
  end if;
  if new.status is not distinct from old.status then
    raise exception 'finance_status_unchanged' using errcode='23514';
  end if;
  if not (
    (tg_table_name='finance_donations' and old.status='pending' and new.status in ('approved','rejected'))
    or (tg_table_name='finance_expenses' and (
      (old.status='pending' and new.status in ('approved','rejected'))
      or (old.status='approved' and new.status='paid')
    ))
  ) then
    raise exception 'finance_invalid_transition' using errcode='23514';
  end if;
  -- Never trust client-supplied decision metadata.
  if new.status='approved' then
    new.approved_by := actor;
    new.approved_at := now();
    new.rejected_by := null;
    new.rejected_at := null;
  elsif new.status='rejected' then
    new.rejected_by := actor;
    new.rejected_at := now();
    new.approved_by := null;
    new.approved_at := null;
  elsif new.status='paid' then
    new.paid_by := actor;
    new.paid_at := now();
  end if;
  return new;
end $$;
revoke all on function app_private.r13_finance_guard() from public,anon,authenticated;
create trigger r13_finance_donations_guard before update on public.finance_donations
for each row execute function app_private.r13_finance_guard();
create trigger r13_finance_expenses_guard before update on public.finance_expenses
for each row execute function app_private.r13_finance_guard();

-- Generate audit rows in the SAME transaction as the business write.
-- Deliberately avoid copying donor contact, notes, receipt URLs and free text
-- into audit snapshots. Historical audit records are left unchanged.
create function app_private.r13_finance_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare before_state jsonb;
        after_state jsonb;
        action_name text;
        actor uuid := (select auth.uid());
begin
  if tg_op='UPDATE' and old.status is not distinct from new.status then return new; end if;
  if tg_table_name='finance_donations' then
    after_state := jsonb_build_object('status',new.status,'amount',new.amount,
      'donation_no',new.donation_no,'purpose',new.purpose,'payment_method',new.payment_method);
    if tg_op='UPDATE' then
      before_state := jsonb_build_object('status',old.status,'amount',old.amount,
        'donation_no',old.donation_no,'purpose',old.purpose,'payment_method',old.payment_method);
    end if;
    action_name := case when tg_op='INSERT' then 'created_donation'
      when new.status='approved' then 'approved_donation'
      else 'rejected_donation' end;
  else
    after_state := jsonb_build_object('status',new.status,'amount',new.amount,
      'category',new.category,'payment_method',new.payment_method);
    if tg_op='UPDATE' then
      before_state := jsonb_build_object('status',old.status,'amount',old.amount,
        'category',old.category,'payment_method',old.payment_method);
    end if;
    action_name := case when tg_op='INSERT' then 'created_expense'
      when new.status='approved' then 'approved_expense'
      when new.status='paid' then 'marked_expense_paid'
      else 'rejected_expense' end;
  end if;
  insert into public.finance_audit_logs(actor_user_id,action,entity_type,entity_id,old_data,new_data)
  values (actor,action_name,tg_table_name,new.id,before_state,after_state);
  return new;
end $$;
revoke all on function app_private.r13_finance_audit() from public,anon,authenticated;
create trigger r13_finance_donations_audit after insert or update on public.finance_donations
for each row execute function app_private.r13_finance_audit();
create trigger r13_finance_expenses_audit after insert or update on public.finance_expenses
for each row execute function app_private.r13_finance_audit();

-- Financial writes must go through validated, replay-safe RPCs. Existing
-- donor-own SELECT, public service-role intake and Storage policies are unchanged.
revoke insert, update on public.finance_donations, public.finance_expenses from authenticated;
drop policy if exists r12_finance_donations_insert on public.finance_donations;
drop policy if exists r12_finance_donations_update on public.finance_donations;
drop policy if exists r12_finance_expenses_insert on public.finance_expenses;
drop policy if exists r12_finance_expenses_update on public.finance_expenses;

-- Admin clients cannot fabricate or overwrite finance audit events.
revoke insert, update, delete on public.finance_audit_logs from authenticated,anon;
drop policy if exists r12_finance_audit_logs_insert on public.finance_audit_logs;

-- One validated operation key can be replayed only by its original actor with
-- the exact same parameters. Concurrent calls serialize on the advisory key;
-- distinct decision keys serialize on the financial row FOR UPDATE.
create function public.finance_decide(
  _entity_type text, _entity_id uuid, _expected_status text,
  _next_status text, _decision_key uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid());
        fingerprint text;
        prior public.finance_operation_keys;
        current_status text;
        outcome jsonb;
begin
  if actor is null or not app_private.finance_super_admin() then
    raise exception 'finance_access_denied' using errcode='42501';
  end if;
  if _decision_key is null or _entity_id is null or
     _entity_type not in ('finance_donations','finance_expenses') or
     _expected_status is null or _next_status is null then
    raise exception 'finance_invalid_request' using errcode='22023';
  end if;
  fingerprint := encode(sha256(convert_to(jsonb_build_object(
    'type',_entity_type,'id',_entity_id,'from',_expected_status,'to',_next_status
  )::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended(_decision_key::text, 0));
  select * into prior from public.finance_operation_keys where idempotency_key=_decision_key;
  if found then
    if prior.actor_user_id<>actor or prior.operation<>'decide' or prior.fingerprint<>fingerprint then
      raise exception 'finance_idempotency_conflict' using errcode='23505';
    end if;
    return prior.result || jsonb_build_object('replayed',true);
  end if;
  if _entity_type='finance_donations' then
    select status into current_status from public.finance_donations where id=_entity_id for update;
  else
    select status into current_status from public.finance_expenses where id=_entity_id for update;
  end if;
  if not found then raise exception 'finance_record_not_found' using errcode='P0002'; end if;
  if current_status is distinct from _expected_status then
    raise exception 'finance_stale_decision' using errcode='40001';
  end if;
  if not ((_entity_type='finance_donations' and _expected_status='pending' and _next_status in ('approved','rejected'))
       or (_entity_type='finance_expenses' and ((_expected_status='pending' and _next_status in ('approved','rejected'))
          or (_expected_status='approved' and _next_status='paid')))) then
    raise exception 'finance_invalid_transition' using errcode='22023';
  end if;
  if _entity_type='finance_donations' then
    update public.finance_donations set status=_next_status where id=_entity_id;
  else
    update public.finance_expenses set status=_next_status where id=_entity_id;
  end if;
  outcome := jsonb_build_object('ok',true,'status',_next_status,'id',_entity_id,'replayed',false);
  insert into public.finance_operation_keys(idempotency_key,actor_user_id,operation,entity_type,entity_id,fingerprint,result)
  values(_decision_key,actor,'decide',_entity_type,_entity_id,fingerprint,outcome);
  return outcome;
end $$;
revoke all on function public.finance_decide(text,uuid,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.finance_decide(text,uuid,text,text,uuid) to authenticated;

-- Idempotent creation for internal Super Admin donation/expense records.
-- All identity, status and decision metadata are server-derived.
create function public.finance_create_record(
  _entity_type text, _request_key uuid, _payload jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := (select auth.uid());
        fingerprint text;
        prior public.finance_operation_keys;
        d public.finance_donations;
        e public.finance_expenses;
        result jsonb;
        allowed_keys text[];
        amount_value numeric;
begin
  if actor is null or not app_private.finance_super_admin() then
    raise exception 'finance_access_denied' using errcode='42501';
  end if;
  if _request_key is null or _entity_type not in ('finance_donations','finance_expenses')
     or jsonb_typeof(_payload) is distinct from 'object' then
    raise exception 'finance_invalid_request' using errcode='22023';
  end if;
  allowed_keys := case when _entity_type='finance_donations' then
    array['donor_name','donor_phone','amount','payment_method','receipt_no','purpose','district','taluka','notes']
    else array['expense_title','amount','category','linked_program_key','linked_application_id','payment_method','paid_to','district','taluka','receipt_no','document_path','notes'] end;
  if exists(select 1 from jsonb_object_keys(_payload) as keys(field) where not (field=any(allowed_keys))) then
    raise exception 'finance_unexpected_fields' using errcode='22023';
  end if;
  if coalesce(_payload->>'amount','') !~ '^[0-9]{1,9}(\.[0-9]{1,2})?$' then
    raise exception 'finance_invalid_amount' using errcode='22023';
  end if;
  amount_value := (_payload->>'amount')::numeric;
  if amount_value<=0 or amount_value>100000000 then raise exception 'finance_invalid_amount' using errcode='22023'; end if;
  if coalesce(_payload->>'payment_method','') not in ('cash','bank','jazzcash','easypaisa','manual_transfer')
    or length(coalesce(_payload->>'notes',''))>2000
    or length(coalesce(_payload->>'district',''))>160
    or length(coalesce(_payload->>'taluka',''))>160
    or length(coalesce(_payload->>'receipt_no',''))>160 then
    raise exception 'finance_invalid_fields' using errcode='22023';
  end if;
  if _entity_type='finance_donations' then
    if length(btrim(coalesce(_payload->>'donor_name',''))) not between 2 and 120
       or coalesce(_payload->>'purpose','') not in ('education','health','welfare','general_fund')
       or length(coalesce(_payload->>'donor_phone',''))>160 then
      raise exception 'finance_invalid_fields' using errcode='22023'; end if;
  else
    if length(btrim(coalesce(_payload->>'expense_title',''))) not between 2 and 200
       or length(btrim(coalesce(_payload->>'paid_to',''))) not between 2 and 200
       or coalesce(_payload->>'category','') not in ('education','health','welfare','office','program','transport','general')
       or coalesce(_payload->>'linked_program_key','') not in ('','education','health','welfare','employment')
       or length(coalesce(_payload->>'document_path',''))>1024 then
      raise exception 'finance_invalid_fields' using errcode='22023'; end if;
    -- An attachment must be inside the authenticated Super Admin's folder.
    if nullif(_payload->>'document_path','') is not null then
      if split_part(_payload->>'document_path','/',1)<>actor::text
         or split_part(_payload->>'document_path','/',2)<>'expenses'
         or not exists (
           select 1 from storage.objects o
           where o.bucket_id='finance-documents' and o.name=_payload->>'document_path'
         ) then
        raise exception 'finance_document_owner_mismatch' using errcode='22023';
      end if;
    end if;
  end if;
  fingerprint := encode(sha256(convert_to(jsonb_build_object('type',_entity_type,'payload',_payload)::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended(_request_key::text,0));
  select * into prior from public.finance_operation_keys where idempotency_key=_request_key;
  if found then
    if prior.actor_user_id<>actor or prior.operation<>'create' or prior.fingerprint<>fingerprint then
      raise exception 'finance_idempotency_conflict' using errcode='23505'; end if;
    return prior.result || jsonb_build_object('replayed',true);
  end if;
  if _entity_type='finance_donations' then
    insert into public.finance_donations(donor_name,donor_phone,amount,payment_method,receipt_no,purpose,district,taluka,notes,status,created_by)
    values(btrim(_payload->>'donor_name'),nullif(_payload->>'donor_phone',''),amount_value,
      _payload->>'payment_method',nullif(_payload->>'receipt_no',''),_payload->>'purpose',
      nullif(_payload->>'district',''),nullif(_payload->>'taluka',''),nullif(_payload->>'notes',''),'pending',actor)
    returning * into d;
    result := jsonb_build_object('ok',true,'id',d.id,'donationNo',d.donation_no,'status','pending','replayed',false);
  else
    insert into public.finance_expenses(expense_title,amount,category,linked_program_key,linked_application_id,
       payment_method,paid_to,district,taluka,receipt_no,document_path,notes,status,created_by)
    values(btrim(_payload->>'expense_title'),amount_value,_payload->>'category',
       nullif(_payload->>'linked_program_key','')::public.program_key,
       nullif(_payload->>'linked_application_id','')::uuid,_payload->>'payment_method',
       btrim(_payload->>'paid_to'),nullif(_payload->>'district',''),nullif(_payload->>'taluka',''),
       nullif(_payload->>'receipt_no',''),nullif(_payload->>'document_path',''),nullif(_payload->>'notes',''),'pending',actor)
    returning * into e;
    result := jsonb_build_object('ok',true,'id',e.id,'status','pending','replayed',false);
  end if;
  insert into public.finance_operation_keys(idempotency_key,actor_user_id,operation,entity_type,entity_id,fingerprint,result)
  values(_request_key,actor,'create',_entity_type,(result->>'id')::uuid,fingerprint,result);
  return result;
end $$;
revoke all on function public.finance_create_record(text,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.finance_create_record(text,uuid,jsonb) to authenticated;

comment on table public.finance_operation_keys is 'Private R1.3 operation replay ledger. Retain as financial evidence; no automatic deletion.';
comment on function public.finance_decide(text,uuid,text,text,uuid) is 'Atomic Super Admin-only, expected-state checked finance decisions; advisory replay key and row lock.';
comment on function public.finance_create_record(text,uuid,jsonb) is 'Idempotent Super Admin finance record creation. All status/actor decisions are server derived.';
notify pgrst, 'reload schema';
commit;
