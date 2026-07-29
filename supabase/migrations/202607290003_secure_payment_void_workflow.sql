-- Secure, audit-preserving payment void workflow.
-- Deliberately not applied automatically.

drop function if exists public.void_pledge_payment(bigint, text);

create function public.void_pledge_payment(
  target_payment_id bigint,
  void_reason text
) returns public.event_pledge_financial_summary
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  payment public.pledge_payments%rowtype;
  pledge public.event_pledges%rowtype;
  void_timestamp timestamptz := statement_timestamp();
  result public.event_pledge_financial_summary%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;
  if length(btrim(coalesce(void_pledge_payment.void_reason, ''))) < 3 then
    raise exception 'A clear void reason is required';
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
    raise exception 'Payment is already voided';
  end if;

  update public.pledge_payments
  set voided_at = void_timestamp,
      void_reason = btrim(void_pledge_payment.void_reason),
      voided_by = auth.uid()
  where id = payment.id;

  insert into public.finance_audit_logs(
    event_id, pledge_id, payment_id, actor_type, actor_user_id, action,
    previous_data, new_data, metadata, created_at
  )
  values (
    pledge.event_id, pledge.id, payment.id, 'authenticated_user', auth.uid(),
    'payment_voided',
    jsonb_build_object(
      'receipt_number', payment.receipt_number,
      'amount', payment.amount,
      'voided_at', payment.voided_at
    ),
    jsonb_build_object(
      'receipt_number', payment.receipt_number,
      'amount', payment.amount,
      'void_reason', btrim(void_pledge_payment.void_reason),
      'actor_user_id', auth.uid(),
      'voided_at', void_timestamp
    ),
    jsonb_build_object(
      'event_id', pledge.event_id,
      'pledge_id', pledge.id,
      'payment_id', payment.id,
      'receipt_number', payment.receipt_number,
      'amount', payment.amount,
      'void_reason', btrim(void_pledge_payment.void_reason),
      'actor_user_id', auth.uid(),
      'voided_at', void_timestamp
    ),
    void_timestamp
  );

  select summary.*
    into result
  from public.event_pledge_financial_summary summary
  where summary.id = pledge.id;

  return result;
end;
$$;

revoke all on function public.void_pledge_payment(bigint, text) from public;
revoke all on function public.void_pledge_payment(bigint, text) from anon;
grant execute on function public.void_pledge_payment(bigint, text) to authenticated;
