-- Web push subscriptions for JAS browser/PWA notifications.
-- Phase 1 stores member browser subscriptions. Sending is handled by
-- Supabase Edge Function: supabase/functions/send-web-push/index.ts

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_key unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

create index if not exists push_subscriptions_enabled_user_idx
  on public.push_subscriptions(user_id, enabled)
  where enabled = true;

create or replace function public.touch_push_subscriptions_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_push_subscriptions_updated_at
  on public.push_subscriptions;

create trigger trg_touch_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row
execute function public.touch_push_subscriptions_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own
  on public.push_subscriptions;

create policy push_subscriptions_select_own
on public.push_subscriptions
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_insert_own
  on public.push_subscriptions;

create policy push_subscriptions_insert_own
on public.push_subscriptions
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_update_own
  on public.push_subscriptions;

create policy push_subscriptions_update_own
on public.push_subscriptions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_delete_own
  on public.push_subscriptions;

create policy push_subscriptions_delete_own
on public.push_subscriptions
for delete
to authenticated
using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.push_subscriptions to authenticated;

comment on table public.push_subscriptions is
  'Browser/PWA push notification subscriptions for logged-in JAS members.';
