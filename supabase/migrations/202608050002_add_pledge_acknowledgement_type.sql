-- Keep newly submitted pledge acknowledgements distinct from completed-pledge thank-yous.
-- Forward-only. Deliberately not applied automatically.

begin;

alter table public.pledge_reminders
  drop constraint if exists pledge_reminders_reminder_type_check;

alter table public.pledge_reminders
  add constraint pledge_reminders_reminder_type_check
  check (reminder_type in (
    'pledge_reminder',
    'pledge_acknowledgement',
    'pledge_thank_you',
    'partial_thank_you',
    'completed_thank_you',
    'daily_summary',
    'receipt_message',
    'custom'
  )) not valid;

alter table public.pledge_reminders
  validate constraint pledge_reminders_reminder_type_check;

commit;
