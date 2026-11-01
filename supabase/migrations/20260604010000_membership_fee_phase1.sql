-- Membership Fee Phase 1
-- Keeps membership application fee separate from voluntary donations/finance records.

do $$
begin
  create type public.membership_payment_status as enum (
    'pending',
    'paid',
    'failed',
    'cancelled',
    'refunded',
    'waived'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.membership_payment_method as enum (
    'manual',
    'jazzcash',
    'easypaisa',
    'bank',
    'gateway'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  base_amount numeric(12,2) not null default 600,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 600,
  currency text not null default 'PKR',
  status public.membership_payment_status not null default 'pending',
  payment_method public.membership_payment_method not null default 'manual',
  gateway_provider text,
  gateway_reference text,
  admin_note text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_payments_amounts_non_negative
    check (base_amount >= 0 and tax_amount >= 0 and total_amount >= 0),
  constraint membership_payments_total_matches_parts
    check (total_amount = base_amount + tax_amount)
);

create unique index if not exists membership_payments_member_id_key
  on public.membership_payments(member_id);

create index if not exists membership_payments_user_id_idx
  on public.membership_payments(user_id);

create index if not exists membership_payments_status_idx
  on public.membership_payments(status);

create or replace function public.touch_membership_payments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_membership_payments_updated_at
  on public.membership_payments;

create trigger trg_touch_membership_payments_updated_at
before update on public.membership_payments
for each row
execute function public.touch_membership_payments_updated_at();

alter table public.membership_payments enable row level security;

drop policy if exists membership_payments_select_own
  on public.membership_payments;
create policy membership_payments_select_own
on public.membership_payments
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists membership_payments_insert_own
  on public.membership_payments;
create policy membership_payments_insert_own
on public.membership_payments
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists membership_payments_select_membership_admin
  on public.membership_payments;
create policy membership_payments_select_membership_admin
on public.membership_payments
for select
to authenticated
using (public.current_user_can_manage_membership());

drop policy if exists membership_payments_update_membership_admin
  on public.membership_payments;
create policy membership_payments_update_membership_admin
on public.membership_payments
for update
to authenticated
using (public.current_user_can_manage_membership())
with check (public.current_user_can_manage_membership());

drop policy if exists membership_payments_insert_membership_admin
  on public.membership_payments;
create policy membership_payments_insert_membership_admin
on public.membership_payments
for insert
to authenticated
with check (public.current_user_can_manage_membership());

grant select, insert, update on public.membership_payments to authenticated;

comment on table public.membership_payments is
  'Dedicated membership application fee/payment records. Do not mix voluntary donations here.';
