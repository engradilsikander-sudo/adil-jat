-- Run as a database owner ONLY in isolated staging after the migration.
-- Counter resets and test calls are rolled back. Stop on any error.
\set ON_ERROR_STOP on
begin;
delete from app_private.public_verification_budget;
do $$
declare i integer; allowed boolean;
begin
  if has_function_privilege('anon','public.lookup_public_office_bearer(text)','execute') then raise exception 'Public office RPC exposed'; end if;
  if has_function_privilege('authenticated','public.consume_verification_budget_v2(text,text)','execute') then raise exception 'Budget RPC exposed'; end if;
  if public.lookup_public_office_bearer('malformed') is not null then raise exception 'Invalid office ID accepted'; end if;
  for i in 1..21 loop
    allowed := public.consume_verification_budget_v2('JAS-2026-0001',repeat('a',64));
    if allowed is distinct from (i<=20) then raise exception 'Resource limit failed at %',i; end if;
  end loop;
end $$;
delete from app_private.public_verification_budget;
do $$
declare i integer; allowed boolean;
begin
  for i in 1..61 loop
    allowed := public.consume_verification_budget_v2('JAS-2026-'||lpad(i::text,4,'0'),repeat('a',64));
    if allowed is distinct from (i<=60) then raise exception 'Client limit failed at %',i; end if;
  end loop;
end $$;
delete from app_private.public_verification_budget;
do $$
declare i integer; allowed boolean;
begin
  for i in 1..301 loop
    allowed := public.consume_verification_budget_v2('JAS-2026-'||lpad(i::text,4,'0'),lpad(to_hex(i),64,'0'));
    if allowed is distinct from (i<=300) then raise exception 'Global limit failed at %',i; end if;
  end loop;
end $$;
rollback;
