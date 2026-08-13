-- A pledge whose only pledge_payments rows are voided has zero live financial
-- impact (total_paid is already 0 for it), but payment_row_count/
-- has_protected_financial_history counted the row anyway, which fully disabled
-- "Delete Permanently" for it (see FinancialContributorsWorkspace.tsx) and forced
-- admins through the payments-override flow even though there was nothing live
-- left to protect. Filter both by voided_at is null, matching the filter already
-- used for total_paid/balance/payment_count on the same view.
--
-- Consequence: permanently_delete_event_pledge's guard now only blocks on LIVE
-- payments. A pledge with only voided payments can go through the normal
-- (non-override) delete path - but the voided pledge_payments rows themselves
-- still physically exist and must be removed before the pledge row, or the
-- pledge_payments FK (on delete restrict) would reject the delete. The function
-- is restructured so any payment rows still present after the guard (voided-only,
-- or all of them when force_delete_payments bypassed the guard) are removed
-- unconditionally before the pledge is deleted.
-- Forward-only. Deliberately not applied automatically.

create or replace view public.event_pledge_financial_summary with (security_invoker=true) as
select p.id,p.event_id,p.guest_id,p.full_name,p.phone,p.normalized_phone,p.email,p.pledged_amount,p.currency_code,p.notes,
 coalesce(sum(pay.amount) filter(where pay.voided_at is null),0::numeric) total_paid,
 greatest(p.pledged_amount-coalesce(sum(pay.amount) filter(where pay.voided_at is null),0::numeric),0::numeric) balance,
 case when p.cancelled_at is not null then 'cancelled' when coalesce(sum(pay.amount) filter(where pay.voided_at is null),0)=0 then 'pledged' when coalesce(sum(pay.amount) filter(where pay.voided_at is null),0)<p.pledged_amount then 'partial' else 'completed' end calculated_status,
 count(pay.id) filter(where pay.voided_at is null) payment_count,max(pay.created_at) filter(where pay.voided_at is null) last_payment_at,
 p.cancelled_at,p.cancellation_reason,p.created_at,p.updated_at,count(pay.id) filter(where pay.voided_at is null) payment_row_count,
 (count(pay.id) filter(where pay.voided_at is null)>0 or exists(select 1 from public.finance_receipt_verifications r join public.pledge_payments rp on rp.id=r.payment_id where rp.pledge_id=p.id and rp.voided_at is null)) has_protected_financial_history,
 p.guest_eligibility_status,g.allowed_guests linked_guest_allowed_guests,p.source,p.public_pledge_link_id,p.expected_completion_date
from public.event_pledges p left join public.pledge_payments pay on pay.pledge_id=p.id left join public.guests g on g.id=p.guest_id and g.event_id=p.event_id
group by p.id,g.allowed_guests;

create or replace function public.permanently_delete_event_pledge(
  target_pledge_id bigint,
  expected_confirmation text,
  force_delete_payments boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  pledge public.event_pledges%rowtype;
  deleted_payment_count integer := 0;
  deleted_payment_total numeric := 0;
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;

  select * into pledge
  from public.event_pledges
  where id = target_pledge_id
  for update;

  if not found then raise exception 'Pledge not found'; end if;
  if not public.is_active_admin() then raise exception 'Not authorized'; end if;
  if pledge.cancelled_at is null then raise exception 'Only cancelled pledges can be permanently deleted'; end if;
  if expected_confirmation is distinct from pledge.full_name then
    raise exception 'Contributor name confirmation does not match';
  end if;

  if exists (select 1 from public.pledge_payments where pledge_id = pledge.id and voided_at is null) then
    if not force_delete_payments then
      raise exception 'Cannot permanently delete because payment history exists.';
    end if;
  end if;

  -- Any payment rows still present at this point are either voided-only (guard
  -- above didn't block them) or all payments when force_delete_payments bypassed
  -- the guard. Either way they must go before the pledge row to satisfy the
  -- pledge_payments FK.
  select count(*), coalesce(sum(amount), 0) into deleted_payment_count, deleted_payment_total
  from public.pledge_payments where pledge_id = pledge.id;

  if deleted_payment_count > 0 then
    delete from public.finance_receipt_verifications where payment_id in (
      select id from public.pledge_payments where pledge_id = pledge.id
    );
    delete from public.pledge_payments where pledge_id = pledge.id;
  end if;

  -- Operational reminder, meeting-invitation, and pledge audit rows may be removed;
  -- the linked guest is intentionally never deleted.
  delete from public.meeting_invitation_deliveries where pledge_id = pledge.id;
  delete from public.pledge_reminders where pledge_id = pledge.id;
  delete from public.finance_audit_logs where pledge_id = pledge.id;
  delete from public.event_pledges where id = pledge.id;

  insert into public.finance_audit_logs(
    event_id, pledge_id, actor_type, actor_user_id, action, previous_data
  ) values (
    pledge.event_id, null, 'authenticated_user', auth.uid(),
    case when deleted_payment_count > 0 then 'pledge_deleted_permanently_with_payments' else 'pledge_deleted_permanently' end,
    jsonb_build_object(
      'pledge_id', pledge.id,
      'guest_id', pledge.guest_id,
      'full_name', pledge.full_name,
      'pledged_amount', pledge.pledged_amount,
      'cancelled_at', pledge.cancelled_at,
      'force_delete_payments', force_delete_payments,
      'deleted_payment_count', deleted_payment_count,
      'deleted_payment_total', deleted_payment_total
    )
  );

  return jsonb_build_object(
    'deleted', true,
    'pledge_id', pledge.id,
    'deletedPaymentCount', deleted_payment_count,
    'deletedPaymentTotal', deleted_payment_total
  );
end;
$$;

revoke all on function public.permanently_delete_event_pledge(bigint,text,boolean) from public, anon;
grant execute on function public.permanently_delete_event_pledge(bigint,text,boolean) to authenticated;
