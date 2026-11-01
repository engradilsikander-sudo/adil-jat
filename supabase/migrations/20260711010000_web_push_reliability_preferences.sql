-- Phase 9 — Web Push Reliability + Preferences
-- Adds user preferences, durable retry queue, rate-limited worker claims,
-- failed-delivery logs and an admin bulk in-app/web-push campaign sender.

create extension if not exists pgcrypto;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  web_push_enabled boolean not null default true,
  membership_updates boolean not null default true,
  program_updates boolean not null default true,
  finance_updates boolean not null default true,
  general_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users can view own notification preferences"
on public.notification_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own notification preferences"
on public.notification_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own notification preferences"
on public.notification_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;

alter table public.push_subscriptions
  add column if not exists device_label text null,
  add column if not exists failure_count integer not null default 0,
  add column if not exists last_success_at timestamptz null,
  add column if not exists last_failure_at timestamptz null,
  add column if not exists disabled_at timestamptz null,
  add column if not exists disabled_reason text null;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_failure_count_check;

alter table public.push_subscriptions
  add constraint push_subscriptions_failure_count_check
  check (failure_count >= 0 and failure_count <= 100000);

create table if not exists public.web_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'failed', 'skipped', 'dead')),
  attempts smallint not null default 0 check (attempts >= 0 and attempts <= 20),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz null,
  worker_id text null,
  last_attempt_at timestamptz null,
  sent_at timestamptz null,
  failed_at timestamptz null,
  http_status integer null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint web_push_deliveries_notification_subscription_key
    unique (notification_id, subscription_id)
);

create index if not exists web_push_delivery_queue_idx
  on public.web_push_deliveries (status, next_attempt_at, created_at)
  where status in ('queued', 'failed', 'sending');

create index if not exists web_push_delivery_user_created_idx
  on public.web_push_deliveries (user_id, created_at desc);

create index if not exists web_push_delivery_notification_idx
  on public.web_push_deliveries (notification_id);

create index if not exists web_push_delivery_attempt_rate_idx
  on public.web_push_deliveries (last_attempt_at desc)
  where last_attempt_at is not null;

alter table public.web_push_deliveries enable row level security;

create policy "Admins can view web push deliveries"
on public.web_push_deliveries
for select
to authenticated
using (public.current_user_is_admin_or_super_admin());

revoke all on public.web_push_deliveries from anon, authenticated;
grant select on public.web_push_deliveries to authenticated;
grant all on public.web_push_deliveries to service_role;

create table if not exists public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  category text not null default 'general',
  action_url text not null default '/notifications',
  target_status text not null default 'approved',
  target_district text null,
  target_taluka text null,
  recipient_limit integer not null default 500,
  recipient_count integer not null default 0,
  push_delivery_count integer not null default 0,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint notification_campaigns_target_status_check
    check (target_status in ('all', 'pending', 'approved', 'rejected')),
  constraint notification_campaigns_category_check
    check (category in ('general', 'membership', 'education', 'health', 'welfare', 'employment', 'donation', 'finance')),
  constraint notification_campaigns_recipient_limit_check
    check (recipient_limit between 1 and 1000),
  constraint notification_campaigns_recipient_count_check
    check (recipient_count >= 0),
  constraint notification_campaigns_push_count_check
    check (push_delivery_count >= 0)
);

create index if not exists notification_campaigns_created_at_idx
  on public.notification_campaigns (created_at desc);

alter table public.notification_campaigns enable row level security;

create policy "Admins can view notification campaigns"
on public.notification_campaigns
for select
to authenticated
using (public.current_user_is_admin_or_super_admin());

revoke all on public.notification_campaigns from anon, authenticated;
grant select on public.notification_campaigns to authenticated;
grant all on public.notification_campaigns to service_role;

-- Keep every bulk campaign creation/change visible in the existing admin audit log.
drop trigger if exists audit_log_changes on public.notification_campaigns;
create trigger audit_log_changes
after insert or update or delete on public.notification_campaigns
for each row execute function public.write_audit_log();

create or replace function public.touch_notification_delivery_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_notification_delivery_updated_at() from public, anon, authenticated;

drop trigger if exists trg_touch_notification_preferences on public.notification_preferences;
create trigger trg_touch_notification_preferences
before update on public.notification_preferences
for each row execute function public.touch_notification_delivery_updated_at();

drop trigger if exists trg_touch_web_push_deliveries on public.web_push_deliveries;
create trigger trg_touch_web_push_deliveries
before update on public.web_push_deliveries
for each row execute function public.touch_notification_delivery_updated_at();

create or replace function public.notification_web_push_is_eligible(
  _user_id uuid,
  _category text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(p.web_push_enabled, true)
    and case lower(coalesce(_category, 'general'))
      when 'membership' then coalesce(p.membership_updates, true)
      when 'education' then coalesce(p.program_updates, true)
      when 'health' then coalesce(p.program_updates, true)
      when 'welfare' then coalesce(p.program_updates, true)
      when 'employment' then coalesce(p.program_updates, true)
      when 'donation' then coalesce(p.finance_updates, true)
      when 'finance' then coalesce(p.finance_updates, true)
      else coalesce(p.general_updates, true)
    end
  from (select 1) seed
  left join public.notification_preferences p on p.user_id = _user_id;
$$;

revoke all on function public.notification_web_push_is_eligible(uuid, text) from public, anon, authenticated;
grant execute on function public.notification_web_push_is_eligible(uuid, text) to service_role;

create or replace function public.queue_notification_web_push()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.notification_web_push_is_eligible(new.user_id, new.category) then
    return new;
  end if;

  insert into public.web_push_deliveries (
    notification_id,
    user_id,
    subscription_id
  )
  select
    new.id,
    new.user_id,
    s.id
  from public.push_subscriptions s
  where s.user_id = new.user_id
    and s.enabled = true
  on conflict (notification_id, subscription_id) do nothing;

  return new;
end;
$$;

revoke all on function public.queue_notification_web_push() from public, anon, authenticated;

drop trigger if exists trg_queue_notification_web_push on public.notifications;
create trigger trg_queue_notification_web_push
after insert on public.notifications
for each row execute function public.queue_notification_web_push();

create or replace function public.claim_web_push_deliveries(
  _limit integer default 20,
  _max_per_minute integer default 120,
  _worker_id text default null
)
returns table (
  delivery_id uuid,
  notification_id uuid,
  user_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  title text,
  message text,
  category text,
  action_url text,
  attempts smallint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _recent_attempts integer;
  _capacity integer;
  _claim_limit integer;
begin
  perform pg_advisory_xact_lock(hashtext('jas_web_push_global_rate_limit'));

  update public.web_push_deliveries d
  set status = 'skipped',
      failed_at = now(),
      locked_at = null,
      worker_id = null,
      last_error = case
        when not exists (
          select 1 from public.push_subscriptions s
          where s.id = d.subscription_id and s.enabled = true
        ) then 'Subscription is disabled.'
        else 'User notification preferences disabled this category.'
      end,
      updated_at = now()
  from public.notifications n
  where n.id = d.notification_id
    and d.status in ('queued', 'failed')
    and (
      not exists (
        select 1 from public.push_subscriptions s
        where s.id = d.subscription_id and s.enabled = true
      )
      or not public.notification_web_push_is_eligible(d.user_id, n.category)
    );

  select count(*)::integer
  into _recent_attempts
  from public.web_push_deliveries
  where last_attempt_at >= now() - interval '1 minute';

  _capacity := greatest(
    0,
    least(coalesce(_max_per_minute, 120), 500) - coalesce(_recent_attempts, 0)
  );

  _claim_limit := least(
    greatest(1, least(coalesce(_limit, 20), 50)),
    _capacity
  );

  if _claim_limit <= 0 then
    return;
  end if;

  return query
  with picked as (
    select d.id
    from public.web_push_deliveries d
    join public.push_subscriptions s on s.id = d.subscription_id
    join public.notifications n on n.id = d.notification_id
    where d.attempts < 5
      and d.next_attempt_at <= now()
      and s.enabled = true
      and public.notification_web_push_is_eligible(d.user_id, n.category)
      and (
        d.status in ('queued', 'failed')
        or (
          d.status = 'sending'
          and d.locked_at < now() - interval '10 minutes'
        )
      )
    order by d.created_at asc
    for update of d skip locked
    limit _claim_limit
  ), claimed as (
    update public.web_push_deliveries d
    set status = 'sending',
        attempts = d.attempts + 1,
        locked_at = now(),
        worker_id = nullif(left(trim(coalesce(_worker_id, '')), 100), ''),
        last_attempt_at = now(),
        http_status = null,
        last_error = null,
        updated_at = now()
    from picked
    where d.id = picked.id
    returning d.*
  )
  select
    c.id,
    n.id,
    c.user_id,
    s.id,
    s.endpoint,
    s.p256dh,
    s.auth,
    n.title,
    n.message,
    n.category,
    coalesce(n.action_url, '/notifications'),
    c.attempts
  from claimed c
  join public.notifications n on n.id = c.notification_id
  join public.push_subscriptions s on s.id = c.subscription_id
  order by c.created_at asc;
end;
$$;

create or replace function public.mark_web_push_delivery_sent(
  _delivery_id uuid,
  _expected_attempt smallint
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _subscription_id uuid;
begin
  update public.web_push_deliveries
  set status = 'sent',
      sent_at = now(),
      failed_at = null,
      locked_at = null,
      worker_id = null,
      http_status = 201,
      last_error = null,
      updated_at = now()
  where id = _delivery_id
    and status = 'sending'
    and attempts = _expected_attempt
  returning subscription_id into _subscription_id;

  if not found then
    return false;
  end if;

  update public.push_subscriptions
  set failure_count = 0,
      last_success_at = now(),
      last_seen_at = now(),
      last_failure_at = null,
      disabled_at = null,
      disabled_reason = null,
      updated_at = now()
  where id = _subscription_id;

  return true;
end;
$$;

create or replace function public.mark_web_push_delivery_failed(
  _delivery_id uuid,
  _expected_attempt smallint,
  _http_status integer,
  _reason text,
  _retryable boolean default true,
  _disable_subscription boolean default false
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _attempts smallint;
  _status text;
  _subscription_id uuid;
  _new_status text;
begin
  select attempts, status, subscription_id
  into _attempts, _status, _subscription_id
  from public.web_push_deliveries
  where id = _delivery_id
  for update;

  if not found then
    return 'missing';
  end if;

  if _status <> 'sending' or _attempts <> _expected_attempt then
    return 'stale';
  end if;

  _new_status := case
    when coalesce(_disable_subscription, false) then 'dead'
    when not coalesce(_retryable, true) then 'dead'
    when _attempts >= 5 then 'dead'
    else 'failed'
  end;

  update public.web_push_deliveries
  set status = _new_status,
      failed_at = now(),
      locked_at = null,
      worker_id = null,
      http_status = _http_status,
      last_error = left(coalesce(nullif(trim(_reason), ''), 'Web push delivery failed.'), 500),
      next_attempt_at = case
        when _new_status = 'failed'
          then now() + make_interval(
            mins => least(60, greatest(1, power(2, greatest(_attempts - 1, 0))::integer))
          )
        else next_attempt_at
      end,
      updated_at = now()
  where id = _delivery_id;

  update public.push_subscriptions
  set failure_count = least(100000, failure_count + 1),
      last_failure_at = now(),
      enabled = case when coalesce(_disable_subscription, false) then false else enabled end,
      disabled_at = case when coalesce(_disable_subscription, false) then now() else disabled_at end,
      disabled_reason = case
        when coalesce(_disable_subscription, false) then 'expired_subscription'
        else disabled_reason
      end,
      updated_at = now()
  where id = _subscription_id;

  return _new_status;
end;
$$;

create or replace function public.retry_web_push_delivery(
  _delivery_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.current_user_is_admin_or_super_admin() then
    raise exception 'Not authorized to retry web push delivery.' using errcode = '42501';
  end if;

  update public.web_push_deliveries d
  set status = 'queued',
      attempts = 0,
      next_attempt_at = now(),
      locked_at = null,
      worker_id = null,
      last_attempt_at = null,
      sent_at = null,
      failed_at = null,
      http_status = null,
      last_error = null,
      updated_at = now()
  where d.id = _delivery_id
    and exists (
      select 1 from public.push_subscriptions s
      where s.id = d.subscription_id and s.enabled = true
    );

  return found;
end;
$$;

-- Bulk browser campaigns must not automatically enter the Phase 8 email queue.
create or replace function public.notification_email_is_eligible(
  _category text,
  _related_type text
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    lower(coalesce(_related_type, '')) <> 'bulk_web_push_campaign'
    and (
      lower(coalesce(_category, '')) = any (
        array[
          'membership',
          'education',
          'health',
          'welfare',
          'employment',
          'donation'
        ]::text[]
      )
      or lower(coalesce(_related_type, '')) = any (
        array[
          'member',
          'membership_payment',
          'profile_update_request',
          'program_application',
          'finance_donation'
        ]::text[]
      )
    );
$$;

create or replace function public.admin_send_bulk_notification(
  _title text,
  _message text,
  _category text default 'general',
  _action_url text default '/notifications',
  _member_status text default 'approved',
  _district text default null,
  _taluka text default null,
  _recipient_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _campaign_id uuid;
  _clean_title text;
  _clean_message text;
  _clean_category text;
  _clean_action_url text;
  _clean_status text;
  _clean_district text;
  _clean_taluka text;
  _limit integer;
  _notification_count integer := 0;
  _push_count integer := 0;
begin
  if not public.current_user_is_admin_or_super_admin() then
    raise exception 'Only admin or super admin can send bulk notifications.' using errcode = '42501';
  end if;

  _clean_title := left(regexp_replace(trim(coalesce(_title, '')), '\s+', ' ', 'g'), 100);
  _clean_message := left(trim(coalesce(_message, '')), 500);
  _clean_category := lower(trim(coalesce(_category, 'general')));
  _clean_status := lower(trim(coalesce(_member_status, 'approved')));
  _clean_district := nullif(left(trim(coalesce(_district, '')), 120), '');
  _clean_taluka := nullif(left(trim(coalesce(_taluka, '')), 120), '');
  _limit := greatest(1, least(coalesce(_recipient_limit, 500), 1000));

  if length(_clean_title) < 3 then
    raise exception 'Notification title must contain at least 3 characters.';
  end if;

  if length(_clean_message) < 5 then
    raise exception 'Notification message must contain at least 5 characters.';
  end if;

  if _clean_category not in ('general', 'membership', 'education', 'health', 'welfare', 'employment', 'donation', 'finance') then
    raise exception 'Invalid notification category.';
  end if;

  if _clean_status not in ('all', 'pending', 'approved', 'rejected') then
    raise exception 'Invalid member status filter.';
  end if;

  _clean_action_url := trim(coalesce(_action_url, '/notifications'));
  if _clean_action_url = ''
    or left(_clean_action_url, 1) <> '/'
    or left(_clean_action_url, 2) = '//'
    or position('\\' in _clean_action_url) > 0
    or _clean_action_url ~ '[[:cntrl:]]'
  then
    _clean_action_url := '/notifications';
  end if;
  _clean_action_url := left(_clean_action_url, 300);

  insert into public.notification_campaigns (
    title,
    message,
    category,
    action_url,
    target_status,
    target_district,
    target_taluka,
    recipient_limit,
    created_by
  ) values (
    _clean_title,
    _clean_message,
    _clean_category,
    _clean_action_url,
    _clean_status,
    _clean_district,
    _clean_taluka,
    _limit,
    (select auth.uid())
  )
  returning id into _campaign_id;

  with recipients as (
    select distinct m.user_id
    from public.members m
    where m.user_id is not null
      and (_clean_status = 'all' or m.status::text = _clean_status)
      and (_clean_district is null or lower(m.district) = lower(_clean_district))
      and (_clean_taluka is null or lower(coalesce(m.taluka, '')) = lower(_clean_taluka))
    order by m.user_id
    limit _limit
  )
  insert into public.notifications (
    user_id,
    title,
    message,
    category,
    related_type,
    related_id,
    action_url
  )
  select
    r.user_id,
    _clean_title,
    _clean_message,
    _clean_category,
    'bulk_web_push_campaign',
    _campaign_id,
    _clean_action_url
  from recipients r;

  get diagnostics _notification_count = row_count;

  select count(*)::integer
  into _push_count
  from public.web_push_deliveries d
  join public.notifications n on n.id = d.notification_id
  where n.related_type = 'bulk_web_push_campaign'
    and n.related_id = _campaign_id;

  update public.notification_campaigns
  set recipient_count = _notification_count,
      push_delivery_count = coalesce(_push_count, 0)
  where id = _campaign_id;

  return jsonb_build_object(
    'campaign_id', _campaign_id,
    'recipient_count', _notification_count,
    'push_delivery_count', coalesce(_push_count, 0),
    'limited_to', _limit
  );
end;
$$;

revoke all on function public.claim_web_push_deliveries(integer, integer, text) from public, anon, authenticated;
revoke all on function public.mark_web_push_delivery_sent(uuid, smallint) from public, anon, authenticated;
revoke all on function public.mark_web_push_delivery_failed(uuid, smallint, integer, text, boolean, boolean) from public, anon, authenticated;
revoke all on function public.retry_web_push_delivery(uuid) from public, anon;
revoke all on function public.admin_send_bulk_notification(text, text, text, text, text, text, text, integer) from public, anon;

grant execute on function public.claim_web_push_deliveries(integer, integer, text) to service_role;
grant execute on function public.mark_web_push_delivery_sent(uuid, smallint) to service_role;
grant execute on function public.mark_web_push_delivery_failed(uuid, smallint, integer, text, boolean, boolean) to service_role;
grant execute on function public.retry_web_push_delivery(uuid) to authenticated, service_role;
grant execute on function public.admin_send_bulk_notification(text, text, text, text, text, text, text, integer) to authenticated, service_role;

comment on table public.notification_preferences is
  'Per-user web push channel and category preferences.';
comment on table public.web_push_deliveries is
  'Durable, rate-limited browser push delivery queue with retry and failure history.';
comment on table public.notification_campaigns is
  'Admin-created bulk in-app and browser push campaigns. Email delivery is intentionally suppressed.';
