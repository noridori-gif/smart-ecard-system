-- Safe payment corrections for authenticated event finance managers.
-- Deliberately not applied automatically.

alter table public.finance_audit_logs
  drop constraint if exists finance_audit_logs_action_check;

alter table public.finance_audit_logs
  add constraint finance_audit_logs_action_check check (action in (
    'pledge_created','pledge_updated','pledge_cancelled','payment_recorded','payment_voided',
    'payment_corrected','reminder_requested','reminder_sent','reminder_failed',
    'organiser_link_created','organiser_link_revoked','pledge_import_completed',
    'bulk_contributions_cleanup'
  ));

create or replace function public.correct_pledge_payment(
  target_payment_id bigint,
  corrected_amount numeric,
  corrected_payment_date date,
  corrected_method text,
  corrected_reference text,
  corrected_provider text,
  corrected_notes text,
  correction_reason text
) returns public.event_pledge_financial_summary
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  payment public.pledge_payments%rowtype;
  pledge public.event_pledges%rowtype;
  other_valid_payments numeric;
  corrected_timestamp timestamptz := statement_timestamp();
  result public.event_pledge_financial_summary%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;
  if corrected_amount is null or corrected_amount <= 0 then
    raise exception 'Corrected payment amount must be greater than zero';
  end if;
  if corrected_payment_date is null then
    raise exception 'A corrected payment date is required';
  end if;
  if corrected_method is null
    or corrected_method not in ('cash','mobile_money','bank','card','other') then
    raise exception 'Unsupported payment method';
  end if;
  if length(btrim(coalesce(correction_reason, ''))) < 3 then
    raise exception 'A clear correction reason is required';
  end if;

  select pay.*
    into payment
  from public.pledge_payments pay
  where pay.id = target_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  select p.*
    into pledge
  from public.event_pledges p
  where p.id = payment.pledge_id
  for update;

  if not found or not public.can_manage_event_finance(pledge.event_id) then
    raise exception 'Not authorized';
  end if;
  if payment.voided_at is not null then
    raise exception 'Voided payments cannot be corrected';
  end if;

  select coalesce(sum(pay.amount), 0)
    into other_valid_payments
  from public.pledge_payments pay
  where pay.pledge_id = pledge.id
    and pay.id <> payment.id
    and pay.voided_at is null;

  if other_valid_payments + corrected_amount > pledge.pledged_amount then
    raise exception 'Corrected payment exceeds the remaining pledge capacity';
  end if;

  update public.pledge_payments
  set amount = corrected_amount,
      payment_date = corrected_payment_date,
      payment_method = corrected_method,
      payment_reference = nullif(btrim(corrected_reference), ''),
      provider = nullif(btrim(corrected_provider), ''),
      notes = nullif(btrim(corrected_notes), '')
  where id = payment.id;

  insert into public.finance_audit_logs(
    event_id, pledge_id, payment_id, actor_type, actor_user_id, action,
    previous_data, new_data, metadata, created_at
  )
  values (
    pledge.event_id, pledge.id, payment.id, 'authenticated_user', auth.uid(),
    'payment_corrected',
    jsonb_build_object(
      'amount', payment.amount,
      'payment_date', payment.payment_date,
      'payment_method', payment.payment_method,
      'payment_reference', payment.payment_reference,
      'provider', payment.provider,
      'notes', payment.notes
    ),
    jsonb_build_object(
      'amount', corrected_amount,
      'payment_date', corrected_payment_date,
      'payment_method', corrected_method,
      'payment_reference', nullif(btrim(corrected_reference), ''),
      'provider', nullif(btrim(corrected_provider), ''),
      'notes', nullif(btrim(corrected_notes), '')
    ),
    jsonb_build_object(
      'correction_reason', btrim(correction_reason),
      'corrected_at', corrected_timestamp
    ),
    corrected_timestamp
  );

  select summary.*
    into result
  from public.event_pledge_financial_summary summary
  where summary.id = pledge.id;

  return result;
end;
$$;

revoke all on function public.correct_pledge_payment(bigint,numeric,date,text,text,text,text,text) from public;
revoke all on function public.correct_pledge_payment(bigint,numeric,date,text,text,text,text,text) from anon;
grant execute on function public.correct_pledge_payment(bigint,numeric,date,text,text,text,text,text) to authenticated;
