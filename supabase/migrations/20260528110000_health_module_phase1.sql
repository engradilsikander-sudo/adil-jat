-- =====================================================
-- JAS Health Program Module - Phase 1
-- Medical assistance applications, private documents,
-- restricted health-admin access, indexes and storage rules.
--
-- Depends on the generic program tables from:
-- 20260527062929_education_module.sql
-- =====================================================

-- =====================================================
-- 1. HEALTH-SPECIFIC PERFORMANCE INDEXES
-- =====================================================

create index if not exists program_applications_health_status_created_idx
on public.program_applications(status, created_at desc)
where program_key = 'health';

create index if not exists program_applications_health_district_taluka_idx
on public.program_applications(district, taluka, status)
where program_key = 'health';

create index if not exists program_applications_health_assigned_admin_idx
on public.program_applications(assigned_admin_id, status, created_at desc)
where program_key = 'health';

create index if not exists program_applications_health_details_gin_idx
on public.program_applications using gin(details)
where program_key = 'health';

create index if not exists program_documents_health_application_status_idx
on public.program_documents(application_id, verification_status)
where program_key = 'health';

-- =====================================================
-- 2. PRIVATE HEALTH DOCUMENT STORAGE BUCKET
-- =====================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'health-documents',
  'health-documents',
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
-- 3. STORAGE RLS POLICIES FOR HEALTH DOCUMENTS
-- Path format:
-- {user_id}/{application_id}/{document_type}-{timestamp}.pdf
-- =====================================================

drop policy if exists "Users upload own health documents"
on storage.objects;

create policy "Users upload own health documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'health-documents'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Users and health admins view health documents"
on storage.objects;

create policy "Users and health admins view health documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'health-documents'
  and (
    auth.uid()::text = split_part(name, '/', 1)
    or public.current_user_is_super_admin()
    or exists (
      select 1
      from public.program_documents pd
      join public.program_applications pa
        on pa.id = pd.application_id
      where pd.file_path = storage.objects.name
        and pd.program_key = 'health'
        and pa.program_key = 'health'
        and public.current_user_can_view_program(
          pa.program_key,
          pa.district,
          pa.taluka
        )
    )
  )
);

drop policy if exists "Users update own health documents"
on storage.objects;

create policy "Users update own health documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'health-documents'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'health-documents'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "Users delete own health documents"
on storage.objects;

create policy "Users delete own health documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'health-documents'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- =====================================================
-- 4. COMMENTS
-- =====================================================

comment on index public.program_applications_health_status_created_idx is
'Health admin list: status plus newest-first sorting.';

comment on index public.program_applications_health_district_taluka_idx is
'Health admin list: district/taluka/status filtering.';

comment on index public.program_applications_health_assigned_admin_idx is
'Health admin list: reviewer assignment filtering/reporting.';

comment on index public.program_documents_health_application_status_idx is
'Health document verification review support.';

-- =====================================================
-- END MIGRATION
-- =====================================================
