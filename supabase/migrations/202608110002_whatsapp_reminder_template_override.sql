-- Per-event override for the Meta-approved WhatsApp pledge-reminder template,
-- so an organizer's own approved template (with their event/committee name
-- baked into its static text) can replace the shared global default.
-- SMS custom templates already work this way (custom_reminder_message);
-- this mirrors that pattern for WhatsApp, scoped to the reminder template only.
-- Forward-only. Deliberately not applied automatically.

alter table public.event_finance_automation_settings
  add column whatsapp_reminder_template_sw text check (char_length(whatsapp_reminder_template_sw) <= 512),
  add column whatsapp_reminder_template_en text check (char_length(whatsapp_reminder_template_en) <= 512),
  add column whatsapp_reminder_template_language_sw text not null default 'sw' check (char_length(whatsapp_reminder_template_language_sw) <= 32),
  add column whatsapp_reminder_template_language_en text not null default 'en_US' check (char_length(whatsapp_reminder_template_language_en) <= 32);
