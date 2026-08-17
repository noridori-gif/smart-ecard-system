-- Organizer-customizable SMS wording for meeting invitations.
-- SMS only - WhatsApp continues to use a Meta-approved template.
-- Forward-only. Deliberately not applied automatically.

alter table public.event_finance_automation_settings
  add column custom_meeting_invitation_message text check (char_length(custom_meeting_invitation_message) <= 1000);
