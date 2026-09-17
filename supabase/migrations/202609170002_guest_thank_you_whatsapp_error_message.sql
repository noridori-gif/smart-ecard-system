-- guest_thank_you_deliveries.error_message gets reset to null on the whole
-- send succeeding via SMS fallback, so the actual reason WhatsApp itself
-- failed was being discarded the moment SMS worked -- confirmed on
-- production after the very first real send (event 14, guest 31):
-- delivery_status='sent', channel='sms', error_message=null, with no
-- server-side log of the original WhatsApp Cloud API error either. This
-- column is written whenever WhatsApp is attempted and fails, and is never
-- cleared just because the overall send later succeeded through SMS.
--
-- Deliberately not applied automatically.

alter table public.guest_thank_you_deliveries add column whatsapp_error_message text;
