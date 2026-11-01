-- Employment Program Module Phase 1
-- Uses existing program_applications and program_documents tables with program_key = 'employment'.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employment-documents',
  'employment-documents',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists program_applications_employment_status_idx
  on public.program_applications (status, created_at desc)
  where program_key = 'employment';

create index if not exists program_applications_employment_location_idx
  on public.program_applications (district, taluka, created_at desc)
  where program_key = 'employment';

create index if not exists program_applications_employment_assigned_idx
  on public.program_applications (assigned_admin_id, created_at desc)
  where program_key = 'employment';

create index if not exists program_documents_employment_application_idx
  on public.program_documents (application_id, document_type)
  where program_key = 'employment';

-- Storage policies for employment documents.
do $$
begin
  create policy "Employment applicants can upload own documents"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'employment-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "Employment applicants can read own documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'employment-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "Employment admins can read employment documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'employment-documents'
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('admin', 'super_admin', 'employment_admin')
    )
  );
exception when duplicate_object then null;
end $$;
