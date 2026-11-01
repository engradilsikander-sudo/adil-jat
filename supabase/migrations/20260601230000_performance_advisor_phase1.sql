-- Performance Advisor Phase 1
-- Safe DB performance hardening for JAS.
--
-- This migration intentionally focuses on low-risk fixes:
-- 1) Add missing indexes for foreign key columns reported by Supabase Performance Advisor.
-- 2) Drop the duplicate user_roles index only if it is not constraint-backed.
-- 3) Optimize RLS policies that directly call auth.uid()/auth.role()/auth.jwt()
--    by wrapping them as scalar subqueries: (select auth.uid()).
--
-- This migration intentionally DOES NOT drop unused indexes and DOES NOT merge
-- multiple permissive policies yet. Those require production traffic data and
-- careful policy-by-policy review.

-- -----------------------------------------------------------------------------
-- 1) Missing foreign-key covering indexes
-- -----------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.admin_area_permissions') is not null then
    create index if not exists admin_area_permissions_created_by_idx
      on public.admin_area_permissions (created_by);
    create index if not exists admin_area_permissions_updated_by_idx
      on public.admin_area_permissions (updated_by);
  end if;

  if to_regclass('public.cms_pages') is not null then
    create index if not exists cms_pages_updated_by_idx
      on public.cms_pages (updated_by);
  end if;

  if to_regclass('public.events') is not null then
    create index if not exists events_created_by_idx
      on public.events (created_by);
  end if;

  if to_regclass('public.finance_expenses') is not null then
    create index if not exists finance_expenses_linked_application_id_idx
      on public.finance_expenses (linked_application_id);
  end if;

  if to_regclass('public.gallery_items') is not null then
    create index if not exists gallery_items_created_by_idx
      on public.gallery_items (created_by);
  end if;

  if to_regclass('public.members') is not null then
    create index if not exists members_reviewed_by_idx
      on public.members (reviewed_by);
  end if;

  if to_regclass('public.news_posts') is not null then
    create index if not exists news_posts_created_by_idx
      on public.news_posts (created_by);
    create index if not exists news_posts_updated_by_idx
      on public.news_posts (updated_by);
  end if;

  if to_regclass('public.organization_committee_members') is not null then
    create index if not exists organization_committee_members_created_by_idx
      on public.organization_committee_members (created_by);
    create index if not exists organization_committee_members_designation_id_idx
      on public.organization_committee_members (designation_id);
    create index if not exists organization_committee_members_updated_by_idx
      on public.organization_committee_members (updated_by);
  end if;

  if to_regclass('public.organization_committees') is not null then
    create index if not exists organization_committees_created_by_idx
      on public.organization_committees (created_by);
    create index if not exists organization_committees_updated_by_idx
      on public.organization_committees (updated_by);
  end if;

  if to_regclass('public.program_admin_assignments') is not null then
    create index if not exists program_admin_assignments_created_by_idx
      on public.program_admin_assignments (created_by);
  end if;

  if to_regclass('public.program_documents') is not null then
    create index if not exists program_documents_verified_by_idx
      on public.program_documents (verified_by);
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 2) Duplicate index fix
-- Supabase reported duplicate indexes:
--   user_roles_user_id_role_key
--   user_roles_user_id_role_unique
-- Keep the constraint-backed index and drop the manual duplicate only when safe.
-- -----------------------------------------------------------------------------

do $$
declare
  duplicate_idx regclass;
begin
  duplicate_idx := to_regclass('public.user_roles_user_id_role_unique');

  if duplicate_idx is not null
     and not exists (
       select 1
       from pg_constraint c
       where c.conindid = duplicate_idx
     ) then
    execute 'drop index if exists public.user_roles_user_id_role_unique';
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 3) RLS auth initplan optimization
-- Wrap auth.<function>() calls in SELECT so Postgres can evaluate them once per
-- statement instead of once per row where possible.
--
-- This rewrites only current public policies whose USING or WITH CHECK clauses
-- still contain direct auth.uid()/auth.role()/auth.jwt() calls.
-- -----------------------------------------------------------------------------

do $$
declare
  policy_row record;
  new_qual text;
  new_with_check text;
  alter_sql text;
  changed boolean;
begin
  for policy_row in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
        or coalesce(qual, '') like '%auth.role()%'
        or coalesce(with_check, '') like '%auth.role()%'
        or coalesce(qual, '') like '%auth.jwt()%'
        or coalesce(with_check, '') like '%auth.jwt()%'
      )
      -- Avoid repeatedly nesting if this migration is re-run.
      and coalesce(qual, '') not ilike '%select auth.uid()%'
      and coalesce(with_check, '') not ilike '%select auth.uid()%'
      and coalesce(qual, '') not ilike '%select auth.role()%'
      and coalesce(with_check, '') not ilike '%select auth.role()%'
      and coalesce(qual, '') not ilike '%select auth.jwt()%'
      and coalesce(with_check, '') not ilike '%select auth.jwt()%'
  loop
    new_qual := policy_row.qual;
    new_with_check := policy_row.with_check;
    changed := false;

    if new_qual is not null then
      new_qual := replace(new_qual, 'auth.uid()', '(select auth.uid())');
      new_qual := replace(new_qual, 'auth.role()', '(select auth.role())');
      new_qual := replace(new_qual, 'auth.jwt()', '(select auth.jwt())');
      changed := changed or new_qual is distinct from policy_row.qual;
    end if;

    if new_with_check is not null then
      new_with_check := replace(new_with_check, 'auth.uid()', '(select auth.uid())');
      new_with_check := replace(new_with_check, 'auth.role()', '(select auth.role())');
      new_with_check := replace(new_with_check, 'auth.jwt()', '(select auth.jwt())');
      changed := changed or new_with_check is distinct from policy_row.with_check;
    end if;

    if changed then
      alter_sql := format(
        'alter policy %I on %I.%I',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename
      );

      if new_qual is not null then
        alter_sql := alter_sql || format(' using (%s)', new_qual);
      end if;

      if new_with_check is not null then
        alter_sql := alter_sql || format(' with check (%s)', new_with_check);
      end if;

      execute alter_sql;
    end if;
  end loop;
end
$$;
