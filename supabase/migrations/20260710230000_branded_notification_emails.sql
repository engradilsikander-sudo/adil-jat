-- Phase 8 — Branded Email Templates + Notification Emails
-- Queues important in-app notifications for reliable server-side delivery.
-- The Brevo API key and worker secret live only in Supabase Edge Function secrets.

create table if not exists public.notification_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique
    references public.notifications(id) on delete cascade,
  provider text not null default 'brevo'
    check (provider in ('brevo')),
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'failed', 'skipped', 'dead')),
  attempts smallint not null default 0
    check (attempts >= 0 and attempts <= 20),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz null,
  sent_at timestamptz null,
  skipped_at timestamptz null,
  failed_at timestamptz null,
  provider_message_id text null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_email_delivery_queue_idx
  on public.notification_email_deliveries (status, next_attempt_at, created_at)
  where status in ('queued', 'failed', 'sending');

create index if not exists notification_email_delivery_notification_idx
  on public.notification_email_deliveries (notification_id);

alter table public.notification_email_deliveries enable row level security;
revoke all on table public.notification_email_deliveries from anon, authenticated;
grant all on table public.notification_email_deliveries to service_role;

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
    );
$$;

create or replace function public.queue_notification_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.notification_email_is_eligible(new.category, new.related_type) then
    insert into public.notification_email_deliveries (notification_id)
    values (new.id)
    on conflict (notification_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.queue_notification_email() from public, anon, authenticated;

drop trigger if exists trg_queue_notification_email on public.notifications;
create trigger trg_queue_notification_email
  after insert on public.notifications
  for each row
  execute function public.queue_notification_email();

create or replace function public.claim_notification_email_jobs(
  _limit integer default 20
)
returns table (
  delivery_id uuid,
  notification_id uuid,
  user_id uuid,
  title text,
  message text,
  category text,
  related_type text,
  action_url text,
  attempts smallint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with picked as (
    select d.id
    from public.notification_email_deliveries d
    where d.attempts < 5
      and d.next_attempt_at <= now()
      and (
        d.status in ('queued', 'failed')
        or (
          d.status = 'sending'
          and d.locked_at < now() - interval '10 minutes'
        )
      )
    order by d.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(_limit, 20), 50))
  ), claimed as (
    update public.notification_email_deliveries d
    set status = 'sending',
        attempts = d.attempts + 1,
        locked_at = now(),
        updated_at = now(),
        last_error = null
    from picked
    where d.id = picked.id
    returning d.*
  )
  select
    c.id,
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.category,
    n.related_type,
    n.action_url,
    c.attempts
  from claimed c
  join public.notifications n on n.id = c.notification_id
  order by c.created_at asc;
end;
$$;

create or replace function public.mark_notification_email_sent(
  _delivery_id uuid,
  _expected_attempt smallint,
  _provider_message_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.notification_email_deliveries
  set status = 'sent',
      provider_message_id = nullif(left(trim(coalesce(_provider_message_id, '')), 500), ''),
      sent_at = now(),
      failed_at = null,
      skipped_at = null,
      locked_at = null,
      last_error = null,
      updated_at = now()
  where id = _delivery_id
    and status = 'sending'
    and attempts = _expected_attempt;

  return found;
end;
$$;

create or replace function public.mark_notification_email_skipped(
  _delivery_id uuid,
  _expected_attempt smallint,
  _reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.notification_email_deliveries
  set status = 'skipped',
      skipped_at = now(),
      failed_at = null,
      locked_at = null,
      last_error = left(coalesce(nullif(trim(_reason), ''), 'Recipient has no deliverable email address.'), 500),
      updated_at = now()
  where id = _delivery_id
    and status = 'sending'
    and attempts = _expected_attempt;

  return found;
end;
$$;

create or replace function public.mark_notification_email_failed(
  _delivery_id uuid,
  _expected_attempt smallint,
  _reason text,
  _retryable boolean default true
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _attempts smallint;
  _status text;
  _new_status text;
begin
  select attempts, status
  into _attempts, _status
  from public.notification_email_deliveries
  where id = _delivery_id
  for update;

  if not found then
    return 'missing';
  end if;

  if _status <> 'sending' or _attempts <> _expected_attempt then
    return 'stale';
  end if;

  _new_status := case
    when not coalesce(_retryable, true) then 'dead'
    when _attempts >= 5 then 'dead'
    else 'failed'
  end;

  update public.notification_email_deliveries
  set status = _new_status,
      failed_at = now(),
      locked_at = null,
      last_error = left(coalesce(nullif(trim(_reason), ''), 'Email delivery failed.'), 500),
      next_attempt_at = case
        when _new_status = 'failed'
          then now() + make_interval(mins => least(60, greatest(1, power(2, greatest(_attempts - 1, 0))::integer)))
        else next_attempt_at
      end,
      updated_at = now()
  where id = _delivery_id;

  return _new_status;
end;
$$;

create or replace function public.retry_notification_email_delivery(
  _delivery_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not (
    public.current_user_is_super_admin()
    or public.current_user_has_role('admin')
  ) then
    raise exception 'Not authorized to retry notification email delivery.';
  end if;

  update public.notification_email_deliveries
  set status = 'queued',
      attempts = 0,
      next_attempt_at = now(),
      locked_at = null,
      sent_at = null,
      skipped_at = null,
      failed_at = null,
      provider_message_id = null,
      last_error = null,
      updated_at = now()
  where id = _delivery_id;

  return found;
end;
$$;

revoke all on function public.notification_email_is_eligible(text, text) from public, anon, authenticated;
revoke all on function public.claim_notification_email_jobs(integer) from public, anon, authenticated;
revoke all on function public.mark_notification_email_sent(uuid, smallint, text) from public, anon, authenticated;
revoke all on function public.mark_notification_email_skipped(uuid, smallint, text) from public, anon, authenticated;
revoke all on function public.mark_notification_email_failed(uuid, smallint, text, boolean) from public, anon, authenticated;
revoke all on function public.retry_notification_email_delivery(uuid) from public, anon;

grant execute on function public.notification_email_is_eligible(text, text) to service_role;
grant execute on function public.claim_notification_email_jobs(integer) to service_role;
grant execute on function public.mark_notification_email_sent(uuid, smallint, text) to service_role;
grant execute on function public.mark_notification_email_skipped(uuid, smallint, text) to service_role;
grant execute on function public.mark_notification_email_failed(uuid, smallint, text, boolean) to service_role;
grant execute on function public.retry_notification_email_delivery(uuid) to authenticated, service_role;

comment on table public.notification_email_deliveries is
  'Server-only delivery queue for important JAS in-app notification emails.';
comment on function public.claim_notification_email_jobs(integer) is
  'Atomically claims queued notification email jobs for the protected Edge Function worker.';
