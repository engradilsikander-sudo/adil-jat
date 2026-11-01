-- Notifications Phase 2
-- Adds membership approval/rejection and membership payment status notifications.

create or replace function public.notify_membership_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _title text;
  _message text;
  _action_url text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.user_id is null then
    return new;
  end if;

  if new.status::text = 'approved' then
    _title := '🎉 مبارک ہو! آپ کی Jatt Alliance Sindh ممبرشپ منظور کر لی گئی ہے';
    _message := $message$محترم رکن،

آپ کی ممبرشپ درخواست کامیابی کے ساتھ منظور کر دی گئی ہے۔ Jatt Alliance Sindh میں شمولیت پر ہم آپ کو دل کی گہرائیوں سے خوش آمدید کہتے ہیں۔

آپ اب جٹ برادری کے اس پلیٹ فارم کا باقاعدہ حصہ ہیں جو اتحاد، تعلیم، فلاح و بہبود اور اجتماعی ترقی کے لیے سرگرم عمل ہے۔

✅ آپ کا ممبرشپ کارڈ تیار کیے جانے کے عمل میں شامل کر دیا گیا ہے۔
✅ QR Code کے ساتھ PVC Membership Card پرنٹ کیا جائے گا۔
✅ کارڈ آپ کے فراہم کردہ پتے پر کورئیر کے ذریعے ارسال کیا جائے گا۔

ہمیں امید ہے کہ آپ تنظیمی سرگرمیوں میں بھرپور کردار ادا کریں گے اور جٹ برادری کے اتحاد و ترقی کے مشن کو مزید مضبوط بنانے میں اپنا حصہ ڈالیں گے۔

شکریہ!$message$;
    _action_url := '/card';
  elsif new.status::text = 'rejected' then
    _title := 'Membership application update';
    _message := 'Your Jatt Alliance Sindh membership application has been rejected. Please review the reason, update your application, and resubmit it.';

    if nullif(trim(coalesce(new.rejection_reason, '')), '') is not null then
      _message := _message || E'\n\nReason: ' || trim(new.rejection_reason);
    end if;

    _action_url := '/register';
  else
    return new;
  end if;

  perform public.create_notification(
    new.user_id,
    _title,
    _message,
    'membership',
    'member',
    new.id,
    _action_url
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_membership_status_change
  on public.members;
create trigger trg_notify_membership_status_change
  after update of status on public.members
  for each row
  execute function public.notify_membership_status_change();

create or replace function public.notify_membership_payment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  _title text;
  _message text;
  _status_label text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.user_id is null then
    return new;
  end if;

  _status_label := case new.status::text
    when 'paid' then 'Paid'
    when 'failed' then 'Failed'
    when 'waived' then 'Waived'
    else null
  end;

  if _status_label is null then
    return new;
  end if;

  _title := case new.status::text
    when 'paid' then 'Membership payment verified'
    when 'failed' then 'Membership payment needs attention'
    when 'waived' then 'Membership fee waived'
    else 'Membership payment updated'
  end;

  _message := case new.status::text
    when 'paid' then 'Your JAS membership fee payment has been marked paid. Your membership application can now continue through review.'
    when 'failed' then 'Your JAS membership fee payment could not be verified. Please open your application and upload a valid receipt or contact JAS support.'
    when 'waived' then 'Your JAS membership fee has been waived by the membership office. Your application can continue without payment verification.'
    else 'Your JAS membership payment status is now: ' || _status_label || '.'
  end;

  perform public.create_notification(
    new.user_id,
    _title,
    _message,
    'membership',
    'membership_payment',
    new.id,
    case new.status::text
      when 'failed' then '/register'
      else '/dashboard'
    end
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_membership_payment_status_change
  on public.membership_payments;
create trigger trg_notify_membership_payment_status_change
  after update of status on public.membership_payments
  for each row
  execute function public.notify_membership_payment_status_change();
