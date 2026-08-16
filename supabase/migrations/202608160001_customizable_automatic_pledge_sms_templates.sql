-- Organizer-customizable SMS wording for automatic pledge/payment acknowledgements.
-- SMS only - WhatsApp continues to use Meta-approved templates.
-- Forward-only. Deliberately not applied automatically.

alter table public.event_finance_automation_settings
  add column custom_pledge_acknowledgement_message text check (char_length(custom_pledge_acknowledgement_message) <= 1000),
  add column custom_payment_received_message text check (char_length(custom_payment_received_message) <= 1000);
