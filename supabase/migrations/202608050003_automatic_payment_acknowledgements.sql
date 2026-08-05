-- Queue one canonical automatic acknowledgement workflow for each new payment transaction.
-- Forward-only. Deliberately not applied automatically.

begin;

alter table public.pledge_reminders
  add column if not exists originating_payment_id bigint
  references public.pledge_payments(id) on delete restrict,
  add column if not exists originating_source text;

alter table public.pledge_reminders
  drop constraint if exists pledge_reminders_reminder_type_check;

alter table public.pledge_reminders
  add constraint pledge_reminders_reminder_type_check
  check (reminder_type in (
    'pledge_reminder',
    'pledge_acknowledgement',
    'payment_received',
    'pledge_thank_you',
    'partial_thank_you',
    'completed_thank_you',
    'daily_summary',
    'receipt_message',
    'custom'
  )) not valid;

alter table public.pledge_reminders
  validate constraint pledge_reminders_reminder_type_check;

create index if not exists pledge_reminders_originating_payment_idx
  on public.pledge_reminders(originating_payment_id)
  where originating_payment_id is not null;

create or replace function public.enqueue_automatic_payment_acknowledgement()
returns trigger
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  pledge public.event_pledges%rowtype;
  total_paid numeric;
  remaining_balance numeric;
  payment_status text;
  workflow_source text;
begin
  if new.amount is null or new.amount <= 0 or new.voided_at is not null then
    return new;
  end if;

  select * into pledge
  from public.event_pledges
  where id=new.pledge_id;

  if not found then
    return new;
  end if;

  select coalesce(sum(amount),0) into total_paid
  from public.pledge_payments
  where pledge_id=new.pledge_id and voided_at is null;

  remaining_balance:=greatest(pledge.pledged_amount-total_paid,0);
  payment_status:=case when remaining_balance<=0 then 'completed' else 'partial' end;
  workflow_source:=case when new.recorded_by is null then 'organiser_link' else 'authenticated_user' end;

  insert into public.workflow_events(
    event_id,event_type,entity_type,entity_id,source,payload,idempotency_key
  ) values (
    pledge.event_id,'payment.recorded','payment',new.id::text,workflow_source,
    jsonb_build_object(
      'payment_id',new.id,
      'pledge_id',new.pledge_id,
      'payment_amount',new.amount,
      'total_paid',total_paid,
      'balance',remaining_balance,
      'calculated_status',payment_status
    ),
    'payment-message:'||new.id
  )
  on conflict(idempotency_key) do nothing;

  return new;
exception when others then
  -- Messaging infrastructure must never roll back a valid payment transaction.
  return new;
end
$$;

drop trigger if exists enqueue_automatic_payment_acknowledgement on public.pledge_payments;
create trigger enqueue_automatic_payment_acknowledgement
after insert on public.pledge_payments
for each row execute function public.enqueue_automatic_payment_acknowledgement();

revoke all on function public.enqueue_automatic_payment_acknowledgement() from public,anon,authenticated;

commit;
