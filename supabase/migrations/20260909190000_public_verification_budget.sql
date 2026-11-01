-- Shared fixed-window budget: 300 lookups/minute total; 20/minute per member number.
-- This bounds database-backed lookups, not requests reaching the hosting platform.
create schema if not exists app_private;
create table if not exists app_private.public_verification_budget (
  bucket text primary key,
  window_start timestamptz not null,
  hits integer not null
);
alter table app_private.public_verification_budget enable row level security;
revoke all on app_private.public_verification_budget from public, anon, authenticated;

create or replace function public.consume_public_verification_budget(_member_no text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  _window timestamptz := date_trunc('minute', statement_timestamp());
  _hits integer;
begin
  if _member_no is null or _member_no !~ '^JAS-[0-9]{4}-[0-9]{4,10}$' then
    return false;
  end if;
  -- All invocations take this row first: concurrent requests serialize atomically.
  insert into app_private.public_verification_budget as b (bucket, window_start, hits)
  values ('global', _window, 1)
  on conflict (bucket) do update set window_start = _window,
    hits = case when b.window_start = _window then least(b.hits + 1, 301) else 1 end
  returning hits into _hits;
  if _hits > 300 then return false; end if;

  delete from app_private.public_verification_budget
    where window_start < _window - interval '10 minutes' and bucket <> 'global';
  insert into app_private.public_verification_budget as b (bucket, window_start, hits)
  values ('member:' || _member_no, _window, 1)
  on conflict (bucket) do update set window_start = _window,
    hits = case when b.window_start = _window then least(b.hits + 1, 21) else 1 end
  returning hits into _hits;
  return _hits <= 20;
end;
$$;
revoke all on function public.consume_public_verification_budget(text) from public, anon, authenticated;
grant execute on function public.consume_public_verification_budget(text) to service_role;
