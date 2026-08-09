-- Organizer-customizable SMS wording for pledge reminders and thank-you messages.
-- SMS only - WhatsApp continues to use Meta-approved templates.
-- Forward-only. Deliberately not applied automatically.

alter table public.event_finance_automation_settings
  add column custom_reminder_message text check (char_length(custom_reminder_message) <= 1000),
  add column custom_thank_you_message text check (char_length(custom_thank_you_message) <= 1000);
