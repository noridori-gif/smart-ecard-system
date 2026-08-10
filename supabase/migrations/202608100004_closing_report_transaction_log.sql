-- Support a full per-payment transaction log in the Financial Closing report
-- (PDF + Excel), including the recorded-by staff name. pledge_payments.recorded_by
-- is a uuid referencing auth.users; resolving it to a display name requires a
-- join through public.profiles, which client-side PostgREST queries cannot do
-- automatically (no direct FK between pledge_payments and profiles) and which
-- general finance-manager RLS on profiles cannot be assumed to allow for other
-- staff members' rows. This mirrors the same resolution finance_receipt_json()
-- already does for individual receipts, but bulk for a whole event's payments.
-- Forward-only. Deliberately not applied automatically.

create or replace function public.get_closing_report_payments(target_event_id bigint)
returns table (
  id bigint, pledge_id bigint, receipt_number text, amount numeric, currency_code text,
  payment_date date, payment_method text, payment_reference text, provider text,
  received_by text, notes text, created_at timestamptz, voided_at timestamptz, void_reason text,
  recorded_by_name text
)
language plpgsql stable security definer set search_path = public, auth, pg_catalog as $$
begin
  if not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  return query
  select pay.id, pay.pledge_id, pay.receipt_number, pay.amount, pay.currency_code,
    pay.payment_date, pay.payment_method, pay.payment_reference, pay.provider,
    pay.received_by, pay.notes, pay.created_at, pay.voided_at, pay.void_reason,
    coalesce(profile.full_name, case when pay.recorded_by is null then 'Committee organiser' else 'Smart Event Pass user' end)
  from public.pledge_payments pay
  join public.event_pledges pledge on pledge.id = pay.pledge_id
  left join public.profiles profile on profile.id = pay.recorded_by
  where pledge.event_id = target_event_id
  order by pay.created_at desc;
end;
$$;
revoke all on function public.get_closing_report_payments(bigint) from public;
grant execute on function public.get_closing_report_payments(bigint) to authenticated;
