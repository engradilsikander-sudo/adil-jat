-- Security Advisor Phase 1
-- Safe for both Supabase Cloud and Local.
-- Goals:
-- 1) Fix mutable search_path warnings for known trigger/helper functions.
-- 2) Remove broad public listing policy from jas-media bucket objects.
-- 3) Revoke anon/public EXECUTE from sensitive SECURITY DEFINER functions.
-- 4) Revoke authenticated EXECUTE from internal trigger/helper functions only.
--
-- Notes:
-- - to_regprocedure(...) is used so this migration does not fail if a function
--   exists in Cloud but not in Local, or vice versa.
-- - Authenticated EXECUTE remains for admin/member RPCs that the current app may
--   call directly. Those functions must continue to enforce role checks inside
--   their bodies. A later Phase 2 can move privileged RPCs behind server actions.

-- ============================================================
-- 1) Fix mutable search_path warnings if functions exist
-- ============================================================
do $$
declare
  fn regprocedure;
  funcs text[] := array[
    'public.set_cms_pages_updated_at()',
    'public.set_public_content_updated_at()',
    'public.touch_organization_updated_at()',
    'public.touch_admin_area_permissions_updated_at()'
  ];
  f text;
begin
  foreach f in array funcs loop
    fn := to_regprocedure(f);

    if fn is not null then
      execute format('alter function %s set search_path = public', fn);
    end if;
  end loop;
end
$$;

-- ============================================================
-- 2) Remove broad public storage object listing from jas-media
-- ============================================================
-- Public buckets do not need a broad SELECT policy for public object URLs.
-- Keeping this policy allows clients to list all files in the bucket.
drop policy if exists "Public can read JAS media"
on storage.objects;

-- ============================================================
-- 3) Lock down internal/trigger/helper functions completely
-- ============================================================
-- These functions are intended to run from triggers or controlled server-side
-- workflows, not as public REST RPC endpoints.
do $$
declare
  fn regprocedure;
  funcs text[] := array[
    'public.create_notification(uuid, text, text, text, text, uuid, text)',
    'public.handle_new_user()',
    'public.notify_donation_status_change()',
    'public.notify_program_application_status_change()',
    'public.set_finance_donation_no()'
  ];
  f text;
begin
  foreach f in array funcs loop
    fn := to_regprocedure(f);

    if fn is not null then
      execute format('revoke execute on function %s from public', fn);
      execute format('revoke execute on function %s from anon', fn);
      execute format('revoke execute on function %s from authenticated', fn);
    end if;
  end loop;
end
$$;

-- ============================================================
-- 4) Revoke public/anon access from sensitive/admin RPCs
-- ============================================================
-- These may still be called by signed-in users/admin UI in the current app.
-- They must enforce role checks internally. This removes anonymous execution
-- while avoiding breaking existing authenticated frontend RPC calls.
do $$
declare
  fn regprocedure;
  funcs text[] := array[
    -- Area permissions
    'public.admin_area_permission_matches(text, text, text, text)',
    'public.delete_admin_area_permission(uuid)',
    'public.get_area_permissions_for_user(uuid)',
    'public.get_my_area_permissions()',
    'public.search_users_for_area_permissions(text, integer)',
    'public.upsert_admin_area_permission(uuid, uuid, text, text, text, text, boolean, boolean, boolean, boolean, text)',

    -- Organization / CMS / Finance / Program access helpers
    'public.current_user_can_manage_organization()',
    'public.current_user_is_admin_or_super_admin()',
    'public.current_user_can_approve_program(public.program_key, text, text)',
    'public.current_user_can_manage_cms()',
    'public.current_user_can_manage_finance()',
    'public.current_user_can_manage_program(public.program_key, text, text)',
    'public.current_user_can_mark_completed_program(public.program_key, text, text)',
    'public.current_user_can_review_program(public.program_key, text, text)',
    'public.current_user_can_view_program(public.program_key, text, text)',
    'public.current_user_has_role(text)',
    'public.current_user_is_super_admin()',

    -- Member/donor helper RPCs
    'public.current_user_can_view_donor_leaderboard()',
    'public.current_user_is_approved_member()',
    'public.get_donor_leaderboard(integer)',
    'public.verify_membership_no(text)',

    -- Roles management admin RPCs
    'public.role_management_assign_role(uuid, public.app_role)',
    'public.role_management_remove_role(uuid, public.app_role)',
    'public.role_management_search_users(text)'
  ];
  f text;
begin
  foreach f in array funcs loop
    fn := to_regprocedure(f);

    if fn is not null then
      execute format('revoke execute on function %s from public', fn);
      execute format('revoke execute on function %s from anon', fn);
      execute format('grant execute on function %s to authenticated', fn);
    end if;
  end loop;
end
$$;
