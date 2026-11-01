-- Membership Manual Payment Bank Details Update
-- Moves manual membership receipt policy from wallet-specific JazzCash method to bank method.
-- Public account details are kept in src/lib/membership-fee.ts, not in the database.

update public.membership_payments
set
  payment_method = 'bank',
  gateway_provider = 'manual_mobilink_microfinance_bank',
  updated_at = now()
where payment_method = 'jazzcash'
  and coalesce(gateway_provider, '') in ('', 'manual_jazzcash')
  and status = 'pending';

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
  and payment_method = 'bank'
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
  and payment_method = 'bank'
  and receipt_path is not null
);
