-- Notifications Phase 1
-- In-app notifications for membership/program/donation status updates.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message text not null,
  category text not null default 'general',
  related_type text null,
  related_id uuid null,
  action_url text null,
  is_read boolean not null default false,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep inserts restricted to triggers/service-role/admin-side workflows.
drop policy if exists "Admins can insert notifications" on public.notifications;
create policy "Admins can insert notifications"
  on public.notifications
  for insert
  with check (
    auth.uid() = user_id
    or public.current_user_has_role('admin')
    or public.current_user_is_super_admin()
  );

create or replace function public.create_notification(
  _user_id uuid,
  _title text,
  _message text,
  _category text default 'general',
  _related_type text default null,
  _related_id uuid default null,
  _action_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _notification_id uuid;
begin
  if _user_id is null then
    return null;
  end if;

  insert into public.notifications (
    user_id,
    title,
    message,
    category,
    related_type,
    related_id,
    action_url
  )
  values (
    _user_id,
    coalesce(nullif(trim(_title), ''), 'JAS notification'),
    coalesce(nullif(trim(_message), ''), 'Your JAS record has been updated.'),
    coalesce(nullif(trim(_category), ''), 'general'),
    _related_type,
    _related_id,
    _action_url
  )
  returning id into _notification_id;

  return _notification_id;
end;
$$;

create or replace function public.notify_program_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _program_label text;
  _status_label text;
  _action_url text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  _program_label := case new.program_key::text
    when 'education' then 'Education application'
    when 'health' then 'Health case'
    when 'welfare' then 'Welfare case'
    when 'employment' then 'Employment profile'
    else initcap(replace(new.program_key::text, '_', ' ')) || ' application'
  end;

  _status_label := case new.status::text
    when 'submitted' then 'Submitted'
    when 'under_review' then 'Under Review'
    when 'need_more_info' then 'Need More Info'
    when 'approved' then 'Approved'
    when 'rejected' then 'Rejected'
    when 'paid_completed' then 'Paid / Completed'
    when 'completed' then 'Completed'
    else initcap(replace(new.status::text, '_', ' '))
  end;

  _action_url := '/programs/' || new.program_key::text || '/' || new.id::text;

  perform public.create_notification(
    new.applicant_user_id,
    _program_label || ' updated',
    _program_label || ' status is now: ' || _status_label || '.',
    new.program_key::text,
    'program_application',
    new.id,
    _action_url
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_program_application_status_change
  on public.program_applications;
create trigger trg_notify_program_application_status_change
  after update of status on public.program_applications
  for each row
  execute function public.notify_program_application_status_change();

create or replace function public.notify_donation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _status_label text;
  _amount text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.donor_user_id is null then
    return new;
  end if;

  _status_label := case new.status
    when 'approved' then 'Approved'
    when 'rejected' then 'Rejected'
    when 'pending' then 'Pending Verification'
    else initcap(replace(new.status, '_', ' '))
  end;

  _amount := 'Rs. ' || trim(to_char(coalesce(new.amount, 0), 'FM999,999,999,990'));

  perform public.create_notification(
    new.donor_user_id,
    'Donation status updated',
    'Your donation ' || coalesce(new.donation_no, '') || ' of ' || _amount || ' is now: ' || _status_label || '.',
    'donation',
    'finance_donation',
    new.id,
    '/donate'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_donation_status_change
  on public.finance_donations;
create trigger trg_notify_donation_status_change
  after update of status on public.finance_donations
  for each row
  execute function public.notify_donation_status_change();
