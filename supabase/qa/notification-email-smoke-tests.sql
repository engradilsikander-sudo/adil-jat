-- Phase 8 database smoke tests.
-- Run after applying 20260710230000_branded_notification_emails.sql.
-- These checks do not send an email.

begin;

select to_regclass('public.notification_email_deliveries') is not null
  as delivery_table_exists;

select public.notification_email_is_eligible('membership', 'member')
  as membership_is_eligible;

select not public.notification_email_is_eligible('general', null)
  as general_is_not_eligible;

select exists (
  select 1
  from pg_trigger
  where tgname = 'trg_queue_notification_email'
    and not tgisinternal
) as queue_trigger_exists;

select has_function_privilege(
  'service_role',
  'public.claim_notification_email_jobs(integer)',
  'EXECUTE'
) as service_role_can_claim;

select not has_function_privilege(
  'authenticated',
  'public.claim_notification_email_jobs(integer)',
  'EXECUTE'
) as members_cannot_claim;

rollback;
