-- STAGING ONLY: temporarily clears limiter counters within a rolled-back transaction.
begin;
delete from app_private.public_verification_budget;
do $$
declare i integer;
begin
  if has_function_privilege('anon', 'public.consume_public_verification_budget(text)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.consume_public_verification_budget(text)', 'EXECUTE') then
    raise exception 'Public roles must not execute limiter';
  end if;
  for i in 1..20 loop
    if not public.consume_public_verification_budget('JAS-2026-0001') then raise exception 'Early per-number denial'; end if;
  end loop;
  if public.consume_public_verification_budget('JAS-2026-0001') then raise exception 'Per-number limit failed'; end if;
  delete from app_private.public_verification_budget;
  for i in 1..300 loop
    if not public.consume_public_verification_budget('JAS-2026-' || lpad(i::text, 6, '0')) then raise exception 'Early global denial'; end if;
  end loop;
  if public.consume_public_verification_budget('JAS-2026-9999') then raise exception 'Global limit failed'; end if;
  update app_private.public_verification_budget set window_start = window_start - interval '2 minutes';
  if not public.consume_public_verification_budget('JAS-2026-0001') then raise exception 'Window reset failed'; end if;
end $$;
rollback;
