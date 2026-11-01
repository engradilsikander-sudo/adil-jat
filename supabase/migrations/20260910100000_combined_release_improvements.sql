-- Extends the previously installed private verification counter table.
create or replace function public.consume_verification_budget_v2(_resource text, _client text)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare w timestamptz := date_trunc('minute', statement_timestamp()); n integer;
begin
  if _resource is null or _resource !~ '^(JAS-[0-9]{4}-[0-9]{4,10}|JAS-OB-[0-9]{4}-[A-F0-9]{8})$'
    or _client is null or _client !~ '^([a-f0-9]{64}|shared-nonvercel)$' then return false; end if;
  insert into app_private.public_verification_budget as b values ('client:' || _client,w,1)
  on conflict (bucket) do update set window_start=w,hits=case when b.window_start=w then least(b.hits+1,61) else 1 end returning hits into n;
  if n>60 then return false; end if;
  insert into app_private.public_verification_budget as b values ('global',w,1)
  on conflict (bucket) do update set window_start=w,hits=case when b.window_start=w then least(b.hits+1,301) else 1 end returning hits into n;
  if n>300 then return false; end if;
  insert into app_private.public_verification_budget as b values ('resource:' || _resource,w,1)
  on conflict (bucket) do update set window_start=w,hits=case when b.window_start=w then least(b.hits+1,21) else 1 end returning hits into n;
  return n<=20;
end $$;
revoke all on function public.consume_verification_budget_v2(text,text) from public,anon,authenticated;
grant execute on function public.consume_verification_budget_v2(text,text) to service_role;

-- Separate scheduled/manual cleanup avoids deleting counters while request locks are held.
create or replace function public.cleanup_verification_budgets()
returns void language sql security definer set search_path = pg_catalog as $$
  delete from app_private.public_verification_budget where window_start < now()-interval '1 day' and bucket <> 'global';
$$;
revoke all on function public.cleanup_verification_budgets() from public,anon,authenticated;
grant execute on function public.cleanup_verification_budgets() to service_role;

create index if not exists committee_member_short_id_idx on public.organization_committee_members ((upper(left(replace(id::text,'-',''),8))));
create or replace function public.lookup_public_office_bearer(_card_id text)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare result jsonb; matches integer;
begin
  if _card_id is null or _card_id !~ '^JAS-OB-[0-9]{4}-[A-F0-9]{8}$' then return null; end if;
  select count(*) into matches from public.organization_committee_members a
  where upper(left(replace(a.id::text,'-',''),8))=right(_card_id,8)
    and extract(year from a.created_at at time zone 'UTC')::text=split_part(_card_id,'-',3);
  if matches<>1 then return null; end if;
  select jsonb_build_object(
    'id',a.id,'committee_id',a.committee_id,'member_id',a.member_id,'designation_title',a.designation_title,
    'status',a.status,'sort_order',a.sort_order,'tenure_start',a.tenure_start,'tenure_end',a.tenure_end,
    'member_no_snapshot',m.member_no,'full_name_snapshot',m.full_name,'father_name_snapshot',m.father_name,
    'district_snapshot',m.district,'taluka_snapshot',m.taluka,'created_at',a.created_at,'updated_at',a.updated_at,
    'committee',jsonb_build_object('id',c.id,'name',c.name,'committee_type',c.committee_type,'division',c.division,'district',c.district,'taluka',c.taluka,'status',c.status,'public_display',true,'notes',null,'tenure_start',c.tenure_start,'tenure_end',c.tenure_end,'created_at',c.created_at,'updated_at',c.updated_at),
    'member',jsonb_build_object('id',m.id,'user_id',null,'full_name',m.full_name,'father_name',m.father_name,'member_no',m.member_no,'district',m.district,'taluka',m.taluka,'photo_url',null,'status',m.status), 'photoSignedUrl',null)
  into result from public.organization_committee_members a
  join public.organization_committees c on c.id=a.committee_id
  join public.members m on m.id=a.member_id
  where upper(left(replace(a.id::text,'-',''),8))=right(_card_id,8)
    and extract(year from a.created_at at time zone 'UTC')::text=split_part(_card_id,'-',3)
    and a.status='active' and c.status='active' and c.public_display and m.status='approved'
    and a.tenure_start<=current_date and a.tenure_end>=current_date;
  return result;
end $$;
revoke all on function public.lookup_public_office_bearer(text) from public,anon,authenticated;
grant execute on function public.lookup_public_office_bearer(text) to service_role;

create or replace function public.admin_email_delivery_health()
returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
begin
  if not coalesce((public.current_user_is_super_admin() or public.current_user_has_role('admin')),false) then raise exception 'Not authorized'; end if;
  return jsonb_build_object('counts',(select coalesce(jsonb_object_agg(status,n),'{}'::jsonb) from (select status,count(*) n from public.notification_email_deliveries group by status) s),
    'recent',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select id,status,attempts,next_attempt_at,created_at from public.notification_email_deliveries order by created_at desc limit 50) r));
end $$;
revoke all on function public.admin_email_delivery_health() from public,anon;
grant execute on function public.admin_email_delivery_health() to authenticated,service_role;
-- Do not permit retries of already sent or currently sending messages.
create or replace function public.retry_notification_email_delivery(_delivery_id uuid)
returns boolean language plpgsql security definer set search_path = public,pg_temp as $$
begin
  if not coalesce((public.current_user_is_super_admin() or public.current_user_has_role('admin')),false) then raise exception 'Not authorized'; end if;
  update public.notification_email_deliveries set status='queued',attempts=0,next_attempt_at=now(),locked_at=null,
    sent_at=null,skipped_at=null,failed_at=null,provider_message_id=null,last_error=null,updated_at=now()
  where id=_delivery_id and status in ('failed','dead');
  return found;
end $$;
