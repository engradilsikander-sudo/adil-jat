-- Membership Manual Payment Receipts Phase 2
-- Requires applicants to upload a manual JazzCash receipt before membership application submission.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'membership-receipts',
  'membership-receipts',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.membership_payments
  add column if not exists receipt_path text,
  add column if not exists receipt_file_name text,
  add column if not exists receipt_mime_type text,
  add column if not exists receipt_size_bytes bigint,
  add column if not exists receipt_uploaded_at timestamptz;

alter table public.membership_payments
  alter column base_amount set default 600,
  alter column total_amount set default 600;

update public.membership_payments
set
  base_amount = 600,
  total_amount = 600,
  updated_at = now()
where status = 'pending'
  and base_amount = 530
  and tax_amount = 0
  and total_amount = 530;

create index if not exists membership_payments_receipt_path_idx
  on public.membership_payments(receipt_path)
  where receipt_path is not null;

drop policy if exists membership_payments_insert_own
  on public.membership_payments;
create policy membership_payments_insert_own
on public.membership_payments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and base_amount = 600
  and tax_amount = 0
  and total_amount = 600
  and currency = 'PKR'
  and payment_method = 'jazzcash'
  and receipt_path is not null
);

drop policy if exists membership_payments_update_own_pending_receipt
  on public.membership_payments;
create policy membership_payments_update_own_pending_receipt
on public.membership_payments
for update
to authenticated
using (
  user_id = auth.uid()
  and status = 'pending'
)
with check (
  user_id = auth.uid()
  and status = 'pending'
  and base_amount = 600
  and tax_amount = 0
  and total_amount = 600
  and currency = 'PKR'
  and payment_method = 'jazzcash'
  and receipt_path is not null
);

-- Storage RLS: membership-receipts
-- Path convention: membership-receipts/{user_id}/receipt-{timestamp}.ext

drop policy if exists "membership_receipts_select_own_or_membership_admin" on storage.objects;
create policy "membership_receipts_select_own_or_membership_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'membership-receipts'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_user_can_manage_membership()
  )
);

drop policy if exists "membership_receipts_insert_own" on storage.objects;
create policy "membership_receipts_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'membership-receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "membership_receipts_update_own_or_membership_admin" on storage.objects;
create policy "membership_receipts_update_own_or_membership_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'membership-receipts'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_user_can_manage_membership()
  )
)
with check (
  bucket_id = 'membership-receipts'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_user_can_manage_membership()
  )
);

drop policy if exists "membership_receipts_delete_own_or_membership_admin" on storage.objects;
create policy "membership_receipts_delete_own_or_membership_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'membership-receipts'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_user_can_manage_membership()
  )
);

comment on column public.membership_payments.receipt_path is
  'Private storage path in membership-receipts bucket for manual membership fee receipt.';
