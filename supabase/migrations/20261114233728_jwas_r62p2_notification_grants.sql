-- JWAS R6.2-P2 N1: restore minimum notification privileges for signed-in users.
-- Existing user-scoped RLS policies remain the authorization boundary.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'notifications'
      AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Refusing notification grants: public.notifications RLS is not enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Users can view own notifications'
      AND cmd = 'SELECT'
      AND qual LIKE '%user_id%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Users can update own notifications'
      AND cmd = 'UPDATE'
      AND qual LIKE '%user_id%'
      AND with_check LIKE '%user_id%'
  ) THEN
    RAISE EXCEPTION 'Refusing notification grants: required owner-scoped RLS policies missing';
  END IF;
END
$$;

GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (is_read, read_at) ON TABLE public.notifications TO authenticated;
