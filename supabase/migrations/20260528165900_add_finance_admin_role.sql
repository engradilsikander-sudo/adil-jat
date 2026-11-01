-- Add finance_admin role separately because PostgreSQL enum values
-- cannot be safely used in the same transaction where they are created.

do $$
begin
  alter type public.app_role add value if not exists 'finance_admin';
exception
  when duplicate_object then null;
end $$;
