-- Emergency disable-only rollback. Run against an explicitly selected database.
-- Keep all donation records, idempotency keys, budgets and receipt objects.
-- Do not restore direct public/member INSERT paths without a validated replacement.
begin;
revoke execute on function public.submit_public_donation(uuid,text,uuid,jsonb,text) from service_role;
revoke execute on function public.consume_donation_intake_budget(text) from service_role;
notify pgrst, 'reload schema';
commit;
-- Re-enable after fixing/validating the server action:
-- grant execute on function public.submit_public_donation(uuid,text,uuid,jsonb,text) to service_role;
-- grant execute on function public.consume_donation_intake_budget(text) to service_role;
