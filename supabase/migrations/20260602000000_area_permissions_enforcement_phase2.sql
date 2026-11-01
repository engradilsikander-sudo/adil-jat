-- Area-based Permissions Enforcement Phase 2
-- Adds a lightweight server helper for area-aware module access checks.
-- Frontend admin pages use get_my_area_permissions() and this helper model to filter rows by district/taluka.

create or replace function public.current_user_can_access_area_module(
  _module_key text,
  _action text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_has_role('super_admin')
    or public.current_user_has_role('admin')
    or exists (
      select 1
      from public.admin_area_permissions p
      where p.user_id = (select auth.uid())
        and p.is_active = true
        and (p.module_key = 'all' or p.module_key = _module_key)
        and (
          (_action = 'view' and p.can_view)
          or (_action = 'review' and p.can_review)
          or (_action = 'approve' and p.can_approve)
        )
    );
$$;

revoke all on function public.current_user_can_access_area_module(text, text) from public;
revoke execute on function public.current_user_can_access_area_module(text, text) from anon;
grant execute on function public.current_user_can_access_area_module(text, text) to authenticated;

-- Keep the row-level area matcher aligned with auth initplan recommendations.
create or replace function public.admin_area_permission_matches(
  _module_key text,
  _district text,
  _taluka text,
  _action text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_has_role('super_admin')
    or public.current_user_has_role('admin')
    or exists (
      select 1
      from public.admin_area_permissions p
      where p.user_id = (select auth.uid())
        and p.is_active = true
        and (p.module_key = 'all' or p.module_key = _module_key)
        and (
          (_action = 'view' and p.can_view)
          or (_action = 'review' and p.can_review)
          or (_action = 'approve' and p.can_approve)
        )
        and (
          p.scope = 'all'
          or (p.scope = 'district' and lower(trim(p.district)) = lower(trim(coalesce(_district, ''))))
          or (
            p.scope = 'taluka'
            and lower(trim(p.district)) = lower(trim(coalesce(_district, '')))
            and lower(trim(p.taluka)) = lower(trim(coalesce(_taluka, '')))
          )
        )
    );
$$;

revoke all on function public.admin_area_permission_matches(text, text, text, text) from public;
revoke execute on function public.admin_area_permission_matches(text, text, text, text) from anon;
grant execute on function public.admin_area_permission_matches(text, text, text, text) to authenticated;
