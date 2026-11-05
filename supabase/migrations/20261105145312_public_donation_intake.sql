-- R1.1: additive public intake; finance-management roles are unchanged.
begin;
create table public.donation_intake_keys (
  idempotency_key uuid primary key,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  donation_id uuid not null unique references public.finance_donations(id),
  created_at timestamptz not null default now()
);
create table public.donation_intake_budgets (
  bucket text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
alter table public.donation_intake_keys enable row level security;
alter table public.donation_intake_budgets enable row level security;
revoke all on public.donation_intake_keys, public.donation_intake_budgets from public, anon, authenticated;
grant all on public.donation_intake_keys, public.donation_intake_budgets to service_role;
-- Anonymous callers must use the server action, never the Data API.
revoke all on public.finance_donations, public.finance_expenses, public.finance_audit_logs, public.finance_donation_counters from anon;
-- All donor intake now uses server validation and idempotency (including members).
drop policy if exists "Approved members can submit own donations" on public.finance_donations;
drop policy if exists "Approved members upload own donation receipts" on storage.objects;
-- Existing member receipt reads and management policies remain for R1.2 review.
update storage.buckets set public = false where id = 'finance-documents';

create function public.consume_donation_intake_budget(_contact_hash text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer; allowed boolean := true; k text;
begin
  if _contact_hash is null or _contact_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid budget key'; end if;
  -- Global cap cannot be bypassed by rotating contact details or proxy headers.
  foreach k in array array['global', 'contact:' || _contact_hash] loop
    insert into public.donation_intake_budgets(bucket, window_start, attempts)
    values (k, date_trunc('hour', now()), 1)
    on conflict (bucket) do update set
      attempts = case when donation_intake_budgets.window_start = date_trunc('hour', now()) then least(donation_intake_budgets.attempts + 1, 1000000) else 1 end,
      window_start = date_trunc('hour', now())
    returning attempts into n;
    if n > (case when k = 'global' then 200 else 10 end) then allowed := false; end if;
  end loop;
  delete from public.donation_intake_budgets where window_start < now() - interval '2 hours' and bucket <> 'global';
  return allowed;
end $$;
revoke all on function public.consume_donation_intake_budget(text) from public, anon, authenticated;
grant execute on function public.consume_donation_intake_budget(text) to service_role;

create function public.submit_public_donation(_key uuid, _fingerprint text, _user_id uuid, _payload jsonb, _receipt_path text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare prior public.donation_intake_keys; d public.finance_donations; m public.members; amount_value numeric;
begin
  if _key is null or _fingerprint is null or _fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid intake key'; end if;
  if jsonb_typeof(_payload) is distinct from 'object'
    or length(btrim(coalesce(_payload->>'donorName',''))) not between 2 and 120
    or length(btrim(coalesce(_payload->>'contact',''))) not between 5 and 160
    or coalesce(_payload->>'amount','') !~ '^[0-9]{1,9}(\.[0-9]{1,2})?$'
    or coalesce(_payload->>'purpose','') not in ('education','health','welfare','general_fund')
    or coalesce(_payload->>'paymentMethod','') not in ('cash','bank','jazzcash','easypaisa','manual_transfer')
    or length(btrim(coalesce(_payload->>'transactionReference',''))) not between 1 and 160
    or length(coalesce(_payload->>'notes','')) > 2000
  then raise exception 'invalid donation fields'; end if;
  amount_value := (_payload->>'amount')::numeric;
  if amount_value <= 0 or amount_value > 100000000 then raise exception 'invalid amount'; end if;
  if _receipt_path is not null and _receipt_path <> 'intake/' || _key::text || '/' || _fingerprint then raise exception 'invalid receipt path'; end if;
  perform pg_advisory_xact_lock(hashtextextended(_key::text, 0));
  select * into prior from public.donation_intake_keys where idempotency_key = _key;
  if found then
    if prior.fingerprint <> _fingerprint then raise exception 'idempotency_conflict'; end if;
    select * into d from public.finance_donations where id = prior.donation_id;
    -- A replay acknowledges intake only, never reveals later verification decisions.
    return jsonb_build_object('donationNo', d.donation_no, 'status', 'pending');
  end if;
  if _user_id is not null then
    -- _user_id is supplied only by the server after Auth.getUser JWT validation.
    select * into m from public.members where user_id = _user_id and status = 'approved' and member_no is not null limit 1;
  end if;
  insert into public.finance_donations (
    donor_name, donor_phone, amount, payment_method, purpose, transaction_reference, notes,
    status, created_by, donor_user_id, donor_member_id, donor_member_no_snapshot,
    donor_name_snapshot, donor_father_name_snapshot, donor_district_snapshot, donor_taluka_snapshot,
    district, taluka, receipt_file_path
  ) values (
    btrim(_payload->>'donorName'), btrim(_payload->>'contact'), amount_value, _payload->>'paymentMethod',
    _payload->>'purpose', btrim(_payload->>'transactionReference'), nullif(_payload->>'notes',''),
    'pending', _user_id, _user_id, m.id, m.member_no, coalesce(m.full_name, btrim(_payload->>'donorName')),
    m.father_name, m.district, m.taluka, m.district, m.taluka, _receipt_path
  ) returning * into d;
  insert into public.donation_intake_keys(idempotency_key, fingerprint, donation_id) values (_key, _fingerprint, d.id);
  return jsonb_build_object('donationNo', d.donation_no, 'status', 'pending');
end $$;
revoke all on function public.submit_public_donation(uuid,text,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.submit_public_donation(uuid,text,uuid,jsonb,text) to service_role;
notify pgrst, 'reload schema';
commit;

