-- Stabilization Patch 1
-- Hardens the shared program-documents bucket used by the education module.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'program-documents',
  'program-documents',
  false,
  5242880,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists idx_program_documents_program_key_type
  on public.program_documents (program_key, document_type);

create index if not exists idx_program_documents_verification_status
  on public.program_documents (program_key, verification_status);
