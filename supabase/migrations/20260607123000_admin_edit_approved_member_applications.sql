-- Allow membership reviewers to correct approved member application details.
-- Normal members remain locked after approval. Status/member number/review fields
-- still change only through the existing server-side approval/rejection workflow.

create or replace function app_private.protect_member_update()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
  then
    raise exception 'Member ownership cannot be changed.';
  end if;

  if new.member_no is distinct from old.member_no
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.approved_at is distinct from old.approved_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Review/card fields can only be changed by server-side admin actions.';
  end if;

  -- Membership reviewers may correct profile/application fields even after approval,
  -- but they cannot change status or rejection reason through this form.
  if old.status in ('pending', 'rejected', 'approved')
    and public.current_user_can_access_membership_area(old.district, old.taluka, 'review')
  then
    if new.status is distinct from old.status
      or new.rejection_reason is distinct from old.rejection_reason
    then
      raise exception 'Use the existing approve/reject actions to change membership status.';
    end if;

    return new;
  end if;

  if old.status = 'pending' then
    if new.status is distinct from 'pending'::public.member_status
      or new.rejection_reason is not null
    then
      raise exception 'Pending applications can only be edited as pending.';
    end if;

    return new;
  end if;

  if old.status = 'rejected' then
    if new.status is distinct from 'pending'::public.member_status
      or new.rejection_reason is not null
    then
      raise exception 'Rejected applications can only be resubmitted as pending.';
    end if;

    return new;
  end if;

  if old.status = 'approved' then
    raise exception 'Approved membership forms cannot be edited by members.';
  end if;

  return new;
end;
$$;

-- Owners can still edit only pending/rejected applications.
-- Membership reviewers can update application/profile fields for pending,
-- rejected, and approved members in their permitted membership area.
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
  or public.current_user_can_access_membership_area(district, taluka, 'review')
)
with check (
  (
    user_id = (select auth.uid())
    and status = 'pending'
    and member_no is null
    and rejection_reason is null
    and approved_at is null
  )
  or public.current_user_can_access_membership_area(district, taluka, 'review')
);

-- Admin profile-photo replacement writes a new object under member.user_id.
-- Keep members locked after approval while allowing membership reviewers to
-- upload/update photos for approved members when a correction is needed.
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
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
    )
  )
);

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
        and public.current_user_can_access_membership_area(m.district, m.taluka, 'review')
    )
  )
);
