alter table public.pledge_reminders
  drop constraint if exists pledge_reminders_reminder_type_check;

alter table public.pledge_reminders
  add constraint pledge_reminders_reminder_type_check
  check (reminder_type in (
    'pledge_reminder',
    'pledge_thank_you',
    'partial_thank_you',
    'completed_thank_you',
    'daily_summary',
    'receipt_message',
    'custom'
  ));

create index if not exists pledge_reminders_type_status_idx
  on public.pledge_reminders(event_id, reminder_type, delivery_status, created_at desc);
