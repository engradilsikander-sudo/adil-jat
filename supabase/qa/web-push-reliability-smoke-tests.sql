-- Phase 9 — Web Push Reliability + Preferences smoke tests
-- Run in Supabase SQL Editor after applying:
-- 20260711010000_web_push_reliability_preferences.sql
--
-- These checks are read-only and raise an exception if an expected object,
-- permission boundary, trigger, or default behavior is missing.

begin;

do $$
declare
  missing_tables text[];
begin
  select array_agg(required.name order by required.name)
  into missing_tables
  from (
    values
      ('notification_preferences'),
      ('notification_campaigns'),
      ('web_push_deliveries')
  ) as required(name)
  where to_regclass('public.' || required.name) is null;

  if missing_tables is not null then
    raise exception 'Missing Phase 9 tables: %', array_to_string(missing_tables, ', ');
  end if;
end;
$$;

do $$
declare
  missing_columns text[];
begin
  select array_agg(required.column_name order by required.column_name)
  into missing_columns
  from (
    values
      ('device_label'),
      ('failure_count'),
      ('last_success_at'),
      ('last_failure_at'),
      ('disabled_at'),
      ('disabled_reason')
  ) as required(column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'push_subscriptions'
      and c.column_name = required.column_name
  );

  if missing_columns is not null then
    raise exception 'Missing push_subscriptions columns: %', array_to_string(missing_columns, ', ');
  end if;
end;
$$;

do $$
declare
  missing_functions text[];
begin
  select array_agg(required.signature order by required.signature)
  into missing_functions
  from (
    values
      ('public.notification_web_push_is_eligible(uuid,text)'),
      ('public.claim_web_push_deliveries(integer,integer,text)'),
      ('public.mark_web_push_delivery_sent(uuid,smallint)'),
      ('public.mark_web_push_delivery_failed(uuid,smallint,integer,text,boolean,boolean)'),
      ('public.retry_web_push_delivery(uuid)'),
      ('public.admin_send_bulk_notification(text,text,text,text,text,text,text,integer)')
  ) as required(signature)
  where to_regprocedure(required.signature) is null;

  if missing_functions is not null then
    raise exception 'Missing Phase 9 functions: %', array_to_string(missing_functions, ', ');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'notifications'
      and t.tgname = 'trg_queue_notification_web_push'
      and not t.tgisinternal
  ) then
    raise exception 'Missing notification web-push queue trigger.';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'notification_campaigns'
      and t.tgname = 'audit_log_changes'
      and not t.tgisinternal
  ) then
    raise exception 'Missing notification campaign audit trigger.';
  end if;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'notification_preferences',
    'notification_campaigns',
    'web_push_deliveries'
  ] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and c.relrowsecurity = true
    ) then
      raise exception 'RLS is not enabled on public.%', table_name;
    end if;
  end loop;
end;
$$;

do $$
declare
  test_user uuid := gen_random_uuid();
begin
  if public.notification_web_push_is_eligible(test_user, 'general') is not true then
    raise exception 'Default web push preference should be enabled when no preference row exists.';
  end if;

  if public.notification_email_is_eligible('membership', 'bulk_web_push_campaign') is not false then
    raise exception 'Bulk web-push campaigns must not enter the email queue.';
  end if;
end;
$$;

select
  'Phase 9 web-push reliability smoke tests passed.' as result,
  now() as checked_at;

rollback;
