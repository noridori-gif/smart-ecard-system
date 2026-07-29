-- Secure restore and permanent deletion for cancelled pledges.
-- Deliberately not applied automatically.

alter table public.finance_audit_logs
  drop constraint if exists finance_audit_logs_action_check;

alter table public.finance_audit_logs
  add constraint finance_audit_logs_action_check check (action in (
    'pledge_created','pledge_updated','pledge_cancelled','pledge_restored',
    'pledge_deleted_permanently','payment_recorded','payment_voided',
    'payment_corrected','reminder_requested','reminder_sent','reminder_failed',
    'organiser_link_created','organiser_link_revoked','pledge_import_completed',
    'bulk_contributions_cleanup'
  ));

create or replace view public.event_pledge_financial_summary
with (security_invoker = true) as
select
  p.id, p.event_id, p.guest_id, p.full_name, p.phone, p.normalized_phone, p.email,
  p.pledged_amount, p.currency_code, p.notes,
  coalesce(sum(pay.amount) filter (where pay.voided_at is null), 0::numeric) as total_paid,
  greatest(p.pledged_amount - coalesce(sum(pay.amount) filter (where pay.voided_at is null), 0::numeric), 0::numeric) as balance,
  case
    when p.cancelled_at is not null then 'cancelled'
    when coalesce(sum(pay.amount) filter (where pay.voided_at is null), 0::numeric) = 0 then 'pledged'
    when coalesce(sum(pay.amount) filter (where pay.voided_at is null), 0::numeric) < p.pledged_amount then 'partial'
    else 'completed'
  end as calculated_status,
  count(pay.id) filter (where pay.voided_at is null) as payment_count,
  max(pay.created_at) filter (where pay.voided_at is null) as last_payment_at,
  p.cancelled_at, p.cancellation_reason, p.created_at, p.updated_at,
  count(pay.id) as payment_row_count,
  (
    count(pay.id) > 0
    or exists (
      select 1
      from public.finance_receipt_verifications receipt
      join public.pledge_payments receipt_payment on receipt_payment.id = receipt.payment_id
      where receipt_payment.pledge_id = p.id
    )
  ) as has_protected_financial_history
from public.event_pledges p
left join public.pledge_payments pay on pay.pledge_id = p.id
group by p.id;

create or replace function public.restore_event_pledge(target_pledge_id bigint)
returns public.event_pledge_financial_summary
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  pledge public.event_pledges%rowtype;
  result public.event_pledge_financial_summary%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;

  select * into pledge
  from public.event_pledges
  where id = target_pledge_id
  for update;

  if not found then raise exception 'Pledge not found'; end if;
  if not public.can_manage_event_finance(pledge.event_id) then raise exception 'Not authorized'; end if;
  if pledge.cancelled_at is null then raise exception 'Pledge is not cancelled'; end if;

  update public.event_pledges
  set cancelled_at = null, cancellation_reason = null
  where id = pledge.id;

  insert into public.finance_audit_logs(
    event_id, pledge_id, actor_type, actor_user_id, action, previous_data, new_data
  ) values (
    pledge.event_id, pledge.id, 'authenticated_user', auth.uid(), 'pledge_restored',
    jsonb_build_object(
      'cancelled_at', pledge.cancelled_at,
      'cancellation_reason', pledge.cancellation_reason
    ),
    jsonb_build_object('cancelled_at', null, 'cancellation_reason', null)
  );

  select * into result
  from public.event_pledge_financial_summary
  where id = pledge.id;

  return result;
end;
$$;

revoke all on function public.restore_event_pledge(bigint) from public, anon;
grant execute on function public.restore_event_pledge(bigint) to authenticated;

create or replace function public.permanently_delete_event_pledge(
  target_pledge_id bigint,
  expected_confirmation text
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  pledge public.event_pledges%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;

  select * into pledge
  from public.event_pledges
  where id = target_pledge_id
  for update;

  if not found then raise exception 'Pledge not found'; end if;
  if not public.can_manage_event_finance(pledge.event_id) then raise exception 'Not authorized'; end if;
  if pledge.cancelled_at is null then raise exception 'Only cancelled pledges can be permanently deleted'; end if;
  if expected_confirmation is distinct from pledge.full_name then
    raise exception 'Contributor name confirmation does not match';
  end if;
  if exists (select 1 from public.pledge_payments where pledge_id = pledge.id) then
    raise exception 'Cannot permanently delete because payment history exists.';
  end if;
  if exists (
    select 1
    from public.finance_receipt_verifications receipt
    join public.pledge_payments payment on payment.id = receipt.payment_id
    where payment.pledge_id = pledge.id
  ) then
    raise exception 'Cannot permanently delete because protected financial history exists.';
  end if;

  -- Operational reminder and pledge audit rows may be removed; payment and receipt
  -- history is protected above. The linked guest is intentionally never deleted.
  delete from public.pledge_reminders where pledge_id = pledge.id;
  delete from public.finance_audit_logs where pledge_id = pledge.id;
  delete from public.event_pledges where id = pledge.id;

  insert into public.finance_audit_logs(
    event_id, pledge_id, actor_type, actor_user_id, action, previous_data
  ) values (
    pledge.event_id, null, 'authenticated_user', auth.uid(), 'pledge_deleted_permanently',
    jsonb_build_object(
      'pledge_id', pledge.id,
      'guest_id', pledge.guest_id,
      'full_name', pledge.full_name,
      'pledged_amount', pledge.pledged_amount,
      'cancelled_at', pledge.cancelled_at
    )
  );

  return jsonb_build_object('deleted', true, 'pledge_id', pledge.id);
end;
$$;

revoke all on function public.permanently_delete_event_pledge(bigint,text) from public, anon;
grant execute on function public.permanently_delete_event_pledge(bigint,text) to authenticated;
