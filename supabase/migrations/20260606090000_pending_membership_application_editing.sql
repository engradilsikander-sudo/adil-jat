-- Pending membership application editing hardening
-- Allows safe member/admin edits before approval while keeping approved/final records locked.


-- Existing member protection trigger blocks rejected-row edits unless they are
-- owner resubmissions. Extend it so membership reviewers can correct pending
-- or rejected profile fields without changing approval/card fields or status.
create or replace function app_private.protect_member_update()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
  -- Server/service role is allowed to perform approval/rejection transitions.
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Members/admins cannot transfer ownership or change the primary row id.
  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
  then
    raise exception 'Member ownership cannot be changed.';
  end if;

  -- Direct client updates must never change card/approval fields.
  if new.member_no is distinct from old.member_no
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.approved_at is distinct from old.approved_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review/card fields can only be changed by server-side admin actions.';
  end if;

  -- Membership reviewers may correct profile/application fields before approval
  -- without changing review status. Area RLS still checks both old/new access.
  if old.status in ('pending', 'rejected')
    and public.current_user_can_access_membership_area(old.district, old.taluka, 'review')
  then
    if new.status is distinct from old.status
      or new.rejection_reason is distinct from old.rejection_reason
    then
      raise exception 'Use the existing approve/reject actions to change membership status.';
    end if;

    return new;
  end if;

  -- Pending owner edits must stay pending and cannot set rejection reason.
  if old.status = 'pending' then
    if new.status is distinct from 'pending'::public.member_status
      or new.rejection_reason is not null
    then
      raise exception 'Pending applications can only be edited as pending.';
    end if;

    return new;
  end if;

  -- Rejected owner resubmission is allowed only by resetting status to pending
  -- and clearing rejection reason.
  if old.status = 'rejected' then
    if new.status is distinct from 'pending'::public.member_status
      or new.rejection_reason is not null
    then
      raise exception 'Rejected applications can only be resubmitted as pending.';
    end if;

    return new;
  end if;

  -- Approved forms cannot be edited by client users.
  if old.status = 'approved' then
    raise exception 'Approved membership forms cannot be edited.';
  end if;

  return new;
end;
$$;

-- Members: owners may update pending/rejected applications through resubmission.
-- Membership reviewers may update only pending/rejected rows through the admin UI.
drop policy if exists "members_update_own_or_membership_area_admin" on public.members;
create policy "members_update_own_or_membership_area_admin"
on public.members
for update
to authenticated
using (
  (
    user_id = (select auth.uid())
    and status in ('pending', 'rejected')
  )
  or (
    status in ('pending', 'rejected')
    and public.current_user_can_access_membership_area(district, taluka, 'review')
  )
)
with check (
  (
    user_id = (select auth.uid())
    and status = 'pending'
    and member_no is null
    and rejection_reason is null
    and approved_at is null
  )
  or (
    status in ('pending', 'rejected')
    and public.current_user_can_access_membership_area(district, taluka, 'review')
  )
);

-- Membership payments: owners can create/update receipt records only for their own
-- non-approved membership application. Final paid/waived payment rows stay locked
-- from member-side receipt replacement.
drop policy if exists membership_payments_insert_own on public.membership_payments;
create policy membership_payments_insert_own
on public.membership_payments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and base_amount = 600
  and tax_amount = 0
  and total_amount = 600
  and currency = 'PKR'
  and payment_method = 'bank'
  and receipt_path is not null
  and exists (
    select 1
    from public.members m
    where m.id = membership_payments.member_id
      and m.user_id = (select auth.uid())
      and m.status in ('pending', 'rejected')
  )
);

drop policy if exists membership_payments_update_own_pending_receipt on public.membership_payments;
create policy membership_payments_update_own_pending_receipt
on public.membership_payments
for update
to authenticated
using (
  user_id = (select auth.uid())
  and status in ('pending', 'failed')
  and exists (
    select 1
    from public.members m
    where m.id = membership_payments.member_id
      and m.user_id = (select auth.uid())
      and m.status in ('pending', 'rejected')
  )
)
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and base_amount = 600
  and tax_amount = 0
  and total_amount = 600
  and currency = 'PKR'
  and payment_method = 'bank'
  and receipt_path is not null
  and exists (
    select 1
    from public.members m
    where m.id = membership_payments.member_id
      and m.user_id = (select auth.uid())
      and m.status in ('pending', 'rejected')
  )
);

-- Admin payment policies stay area-aware by joining back to the member row.
drop policy if exists membership_payments_select_membership_admin on public.membership_payments;
create policy membership_payments_select_membership_admin
on public.membership_payments
for select
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = membership_payments.member_id
      and public.current_user_can_access_membership_area(m.district, m.taluka, 'view')
  )
);

drop policy if exists membership_payments_update_membership_admin on public.membership_payments;
create policy membership_payments_update_membership_admin
on public.membership_payments
for update
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = membership_payments.member_id
      and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
  )
)
with check (
  exists (
    select 1
    from public.members m
    where m.id = membership_payments.member_id
      and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
  )
);

drop policy if exists membership_payments_insert_membership_admin on public.membership_payments;
create policy membership_payments_insert_membership_admin
on public.membership_payments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.members m
    where m.id = membership_payments.member_id
      and m.user_id = membership_payments.user_id
      and m.status in ('pending', 'rejected')
      and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
  )
);

-- Storage inserts: members can upload before/while an application is editable;
-- membership reviewers can upload replacement files for pending/rejected members.
drop policy if exists "member_photos_insert_own" on storage.objects;
drop policy if exists "member_photos_insert_own_or_membership_admin" on storage.objects;
create policy "member_photos_insert_own_or_membership_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-photos'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and not exists (
        select 1
        from public.members m
        where m.user_id = (select auth.uid())
          and m.status = 'approved'
      )
    )
    or exists (
      select 1
      from public.members m
      where m.user_id::text = (storage.foldername(storage.objects.name))[1]
        and m.status in ('pending', 'rejected')
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
    )
  )
);

drop policy if exists "membership_receipts_insert_own" on storage.objects;
drop policy if exists "membership_receipts_insert_own_or_membership_admin" on storage.objects;
create policy "membership_receipts_insert_own_or_membership_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'membership-receipts'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and not exists (
        select 1
        from public.members m
        where m.user_id = (select auth.uid())
          and m.status = 'approved'
      )
    )
    or exists (
      select 1
      from public.members m
      where m.user_id::text = (storage.foldername(storage.objects.name))[1]
        and m.status in ('pending', 'rejected')
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
    )
  )
);

-- Storage updates stay locked after approval/final payment. Current UI writes
-- timestamped object names, but these guards make accidental upserts safe too.
drop policy if exists "member_photos_update_own_or_admin" on storage.objects;
create policy "member_photos_update_own_or_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and not exists (
        select 1
        from public.members m
        where m.user_id = (select auth.uid())
          and m.status = 'approved'
      )
    )
    or exists (
      select 1
      from public.members m
      where m.user_id::text = (storage.foldername(storage.objects.name))[1]
        and m.status in ('pending', 'rejected')
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
    )
  )
)
with check (
  bucket_id = 'member-photos'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and not exists (
        select 1
        from public.members m
        where m.user_id = (select auth.uid())
          and m.status = 'approved'
      )
    )
    or exists (
      select 1
      from public.members m
      where m.user_id::text = (storage.foldername(storage.objects.name))[1]
        and m.status in ('pending', 'rejected')
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
    )
  )
);

drop policy if exists "membership_receipts_update_own_or_membership_admin" on storage.objects;
create policy "membership_receipts_update_own_or_membership_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'membership-receipts'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1
        from public.members m
        where m.user_id = (select auth.uid())
          and m.status in ('pending', 'rejected')
      )
      and not exists (
        select 1
        from public.membership_payments p
        where p.user_id = (select auth.uid())
          and p.status in ('paid', 'waived')
      )
    )
    or exists (
      select 1
      from public.members m
      left join public.membership_payments p
        on p.member_id = m.id
      where m.user_id::text = (storage.foldername(storage.objects.name))[1]
        and m.status in ('pending', 'rejected')
        and coalesce(p.status::text, 'pending') not in ('paid', 'waived')
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
    )
  )
)
with check (
  bucket_id = 'membership-receipts'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1
        from public.members m
        where m.user_id = (select auth.uid())
          and m.status in ('pending', 'rejected')
      )
      and not exists (
        select 1
        from public.membership_payments p
        where p.user_id = (select auth.uid())
          and p.status in ('paid', 'waived')
      )
    )
    or exists (
      select 1
      from public.members m
      left join public.membership_payments p
        on p.member_id = m.id
      where m.user_id::text = (storage.foldername(storage.objects.name))[1]
        and m.status in ('pending', 'rejected')
        and coalesce(p.status::text, 'pending') not in ('paid', 'waived')
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
    )
  )
);
