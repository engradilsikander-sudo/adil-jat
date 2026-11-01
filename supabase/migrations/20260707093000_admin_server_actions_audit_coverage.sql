-- Patch 3: Admin Server Actions + Audit Log Coverage v2
-- Adds membership payment records to the central audit trail and improves labels.

create or replace function public.audit_module_for_record(
  _table_name text,
  _row_data jsonb
)
returns text
language plpgsql
stable
as $$
begin
  if _table_name in ('members', 'member_counters', 'membership_payments') then
    return 'membership';
  end if;

  if _table_name in ('user_roles') then
    return 'roles';
  end if;

  if _table_name in ('admin_area_permissions') then
    return 'area_permissions';
  end if;

  if _table_name in (
    'organization_committees',
    'organization_designations',
    'organization_committee_members'
  ) then
    return 'committees';
  end if;

  if _table_name like 'finance_%' then
    return 'finance';
  end if;

  if _table_name in ('program_applications', 'program_documents') then
    return coalesce(nullif(_row_data ->> 'program_key', ''), 'programs');
  end if;

  if _table_name in ('news_posts', 'gallery_items', 'events') then
    return 'media';
  end if;

  if _table_name in ('cms_pages') then
    return 'cms';
  end if;

  return 'system';
end;
$$;

create or replace function public.audit_record_label(
  _table_name text,
  _row_data jsonb
)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(_row_data ->> 'member_no', ''),
    case
      when _table_name = 'membership_payments'
      then 'Membership payment · ' || nullif(_row_data ->> 'member_id', '')
      else null
    end,
    nullif(_row_data ->> 'application_no', ''),
    nullif(_row_data ->> 'donation_no', ''),
    nullif(_row_data ->> 'expense_no', ''),
    nullif(_row_data ->> 'receipt_no', ''),
    nullif(_row_data ->> 'title', ''),
    nullif(_row_data ->> 'name', ''),
    nullif(_row_data ->> 'full_name', ''),
    nullif(_row_data ->> 'applicant_name', ''),
    nullif(_row_data ->> 'patient_name', ''),
    nullif(_row_data ->> 'student_name', ''),
    nullif(_row_data ->> 'committee_name', ''),
    nullif(_row_data ->> 'designation_title', ''),
    nullif(_row_data ->> 'id', '')
  );
$$;

create or replace function public.audit_action_label(
  _table_name text,
  _action text,
  _row_data jsonb
)
returns text
language plpgsql
stable
as $$
begin
  if _table_name = 'members' then
    if _action = 'insert' then return 'Membership application created'; end if;
    if _action = 'delete' then return 'Membership application removed'; end if;

    if coalesce(_row_data ->> 'status', '') = 'approved' then
      return 'Membership application approved/updated';
    end if;

    if coalesce(_row_data ->> 'status', '') = 'rejected' then
      return 'Membership application rejected/updated';
    end if;

    return 'Membership application updated';
  end if;

  if _table_name = 'membership_payments' then
    if _action = 'insert' then return 'Membership payment created'; end if;
    if _action = 'delete' then return 'Membership payment removed'; end if;

    if coalesce(_row_data ->> 'status', '') = 'paid' then
      return 'Membership payment marked paid';
    end if;

    if coalesce(_row_data ->> 'status', '') = 'waived' then
      return 'Membership payment waived';
    end if;

    if coalesce(_row_data ->> 'status', '') = 'failed' then
      return 'Membership payment marked failed';
    end if;

    return 'Membership payment updated';
  end if;

  if _table_name = 'user_roles' then
    if _action = 'insert' then return 'Admin role assigned'; end if;
    if _action = 'delete' then return 'Admin role removed'; end if;
    return 'Admin role updated';
  end if;

  if _table_name = 'admin_area_permissions' then
    if _action = 'insert' then return 'Area permission granted'; end if;
    if _action = 'delete' then return 'Area permission removed'; end if;
    return 'Area permission updated';
  end if;

  if _table_name in ('program_applications', 'program_documents') then
    if _action = 'insert' then return 'Program record created'; end if;
    if _action = 'delete' then return 'Program record removed'; end if;
    return 'Program record updated';
  end if;

  if _table_name in ('finance_donations', 'finance_expenses', 'finance_audit_logs') then
    if _action = 'insert' then return 'Finance record created'; end if;
    if _action = 'delete' then return 'Finance record removed'; end if;
    return 'Finance record updated';
  end if;

  if _table_name in (
    'organization_committees',
    'organization_designations',
    'organization_committee_members'
  ) then
    if _action = 'insert' then return 'Organization record created'; end if;
    if _action = 'delete' then return 'Organization record removed'; end if;
    return 'Organization record updated';
  end if;

  if _table_name in ('cms_pages', 'news_posts', 'gallery_items', 'events') then
    if _action = 'insert' then return 'Public content created'; end if;
    if _action = 'delete' then return 'Public content removed'; end if;
    return 'Public content updated';
  end if;

  if _action = 'insert' then return 'Record created'; end if;
  if _action = 'delete' then return 'Record removed'; end if;
  return 'Record updated';
end;
$$;

do $$
begin
  if to_regclass('public.membership_payments') is not null then
    execute 'drop trigger if exists audit_log_changes on public.membership_payments';
    execute 'create trigger audit_log_changes after insert or update or delete on public.membership_payments for each row execute function public.write_audit_log()';
  end if;
end
$$;
