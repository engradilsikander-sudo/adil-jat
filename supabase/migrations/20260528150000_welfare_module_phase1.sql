-- =====================================================
-- JAS Welfare Case Management - Phase 1
-- Social welfare support cases, private documents,
-- restricted welfare-admin access, indexes and storage rules.
--
-- Depends on the generic program tables from:
-- 20260527062929_education_module.sql
-- and program_application_counters from Health Phase 2
-- if professional case numbers are desired.
-- =====================================================

-- =====================================================
-- 1. WELFARE PERFORMANCE INDEXES
-- =====================================================

create index if not exists program_applications_welfare_status_created_idx
on public.program_applications(status, created_at desc)
where program_key = 'welfare';

create index if not exists program_applications_welfare_district_taluka_idx
on public.program_applications(district, taluka, status)
where program_key = 'welfare';

create index if not exists program_applications_welfare_assigned_admin_idx
on public.program_applications(assigned_admin_id, status, created_at desc)
where program_key = 'welfare';

create index if not exists program_applications_welfare_details_gin_idx
on public.program_applications using gin(details)
where program_key = 'welfare';

create index if not exists program_applications_welfare_case_type_idx
on public.program_applications ((details->>'case_type'), status, created_at desc)
where program_key = 'welfare';

create index if not exists program_applications_welfare_priority_idx
on public.program_applications ((details->>'case_priority'), created_at desc)
where program_key = 'welfare';

create index if not exists program_applications_welfare_committee_decision_idx
on public.program_applications ((details->>'welfare_committee_decision'), status, created_at desc)
where program_key = 'welfare';

create index if not exists program_applications_welfare_payment_status_idx
on public.program_applications ((details->>'payment_status'), status, created_at desc)
where program_key = 'welfare';

create index if not exists program_documents_welfare_application_status_idx
on public.program_documents(application_id, verification_status)
where program_key = 'welfare';

-- =====================================================
-- 2. PRIVATE WELFARE DOCUMENT STORAGE BUCKET
-- =====================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'welfare-documents',
  'welfare-documents',
  false,
  8388608,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- =====================================================
-- 3. STORAGE RLS POLICIES FOR WELFARE DOCUMENTS
-- Path format:
-- {user_id}/{application_id}/{document_type}-{timestamp}.pdf
-- =====================================================

drop policy if exists "Users upload own welfare documents"
on storage.objects;

create policy "Users upload own welfare documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'welfare-documents'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Users and welfare admins view welfare documents"
on storage.objects;

create policy "Users and welfare admins view welfare documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'welfare-documents'
  and (
    auth.uid()::text = split_part(name, '/', 1)
    or public.current_user_is_super_admin()
    or exists (
      select 1
      from public.program_documents pd
      join public.program_applications pa
        on pa.id = pd.application_id
      where pd.file_path = storage.objects.name
        and pd.program_key = 'welfare'
        and pa.program_key = 'welfare'
        and public.current_user_can_view_program(
          pa.program_key,
          pa.district,
          pa.taluka
        )
    )
  )
);

drop policy if exists "Users update own welfare documents"
on storage.objects;

create policy "Users update own welfare documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'welfare-documents'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'welfare-documents'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Users delete own welfare documents"
on storage.objects;

create policy "Users delete own welfare documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'welfare-documents'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- =====================================================
-- 4. COMMENTS
-- =====================================================

comment on index public.program_applications_welfare_status_created_idx is
'Welfare admin list: status plus newest-first sorting.';

comment on index public.program_applications_welfare_district_taluka_idx is
'Welfare admin list: district/taluka/status filtering.';

comment on index public.program_applications_welfare_case_type_idx is
'Welfare admin list: case type filtering/reporting.';

comment on index public.program_applications_welfare_priority_idx is
'Welfare admin list: emergency-first priority queue.';

comment on index public.program_applications_welfare_committee_decision_idx is
'Welfare committee decision filtering and reports.';

comment on index public.program_documents_welfare_application_status_idx is
'Welfare document verification review support.';

-- =====================================================
-- END MIGRATION
-- =====================================================
