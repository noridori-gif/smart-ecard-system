-- Apply through the normal reviewed migration workflow. Do not run ad hoc in production.
--
-- Adds an organizer-facing contact phone line to events, for the "MAWASILIANO"
-- block on the upcoming gilded_border WhatsApp invitation preset. Freeform
-- text (not a single-number phone regex like event_finance_automation_settings'
-- owner_summary_phone) since organizers commonly list two numbers on an
-- invitation ("0712 345 678 / 0754 111 222"), not always one normalized
-- Tanzanian MSISDN. Nullable and shown only when set -- every other preset
-- template is unaffected.
alter table public.events
  add column if not exists contact_phone text
  check (contact_phone is null or char_length(contact_phone) <= 100);
