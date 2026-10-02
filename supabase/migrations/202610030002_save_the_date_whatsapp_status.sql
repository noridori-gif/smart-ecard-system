-- Save the Date: record WhatsApp delivery receipts. Meta can accept a template and fail it later
-- (e.g. 131053 when it cannot fetch the card image), and that only arrives through the webhook --
-- without this a failed WhatsApp send kept showing "Imetumwa".
--
-- Same shape as meeting_invitation_deliveries: delivery_status also allows 'delivered' and 'read',
-- with delivered_at / read_at. app/api/whatsapp/webhook updates rows by provider_message_id where
-- channel = 'whatsapp' (SMS rows are never touched). A webhook 'failed' makes the row retryable from
-- the Save the Date tab, like a failed send.
--
-- Requires 202610030001_save_the_date.sql. Deliberately not applied automatically.

begin;

alter table public.save_the_date_deliveries
  drop constraint if exists save_the_date_deliveries_delivery_status_check;
alter table public.save_the_date_deliveries
  add constraint save_the_date_deliveries_delivery_status_check
  check (delivery_status in ('processing', 'sent', 'delivered', 'read', 'failed'));

alter table public.save_the_date_deliveries
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

create index if not exists save_the_date_deliveries_provider_message_idx
  on public.save_the_date_deliveries(provider_message_id)
  where provider_message_id is not null;

commit;
