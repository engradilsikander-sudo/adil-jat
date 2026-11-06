-- JAS R1.3-r3: Fix PostgREST retry loop on stale finance decisions.
-- This is a forward-only additive migration; do not modify applied R1.3 SQL.
-- No finance data, policies, grants, or audit history are changed.
begin;

-- Refuse to replace a different finance_decide implementation.
do $guard$
declare fn_def text;
begin
  if to_regprocedure('public.finance_decide(text,uuid,text,text,uuid)') is null then
    raise exception 'Expected R1.3 finance_decide missing';
  end if;
  fn_def := pg_get_functiondef('public.finance_decide(text,uuid,text,text,uuid)'::regprocedure);
  if position('finance_stale_decision' in fn_def)=0
     or position('errcode=''40001''' in fn_def)=0
     or position('pg_advisory_xact_lock' in fn_def)=0 then
    raise exception 'Unexpected finance_decide definition; inspect before applying';
  end if;
end
$guard$;

create or replace function public.finance_decide(
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
    raise sqlstate 'PT409' using message='finance_stale_decision';
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

-- CREATE OR REPLACE preserves function identity, owner and existing grants.
comment on function public.finance_decide(text,uuid,text,text,uuid) is
  'Atomic Super Admin finance decisions; stale state returns PT409 without triggering PostgREST transaction retry';
notify pgrst, 'reload schema';
commit;
