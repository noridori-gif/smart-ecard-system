-- Bug: permanently_delete_event_pledge deletes finance_receipt_verifications
-- (payment_id -> pledge_payments, on delete restrict) before deleting
-- pledge_payments, but never touched finance_audit_logs.payment_id, which is a
-- SEPARATE nullable FK to pledge_payments(id) also on delete restrict
-- (finance_audit_logs_payment_id_fkey). Any prior payment_recorded/
-- payment_voided/payment_corrected audit rows for this pledge's payments still
-- referenced them, so "delete from pledge_payments" was rejected with a FK
-- violation - reproduced on Adam Adam's force-delete attempt. The transaction
-- rolled back, so no data was lost.
--
-- Fix: payment_id is nullable and pledge_id already identifies which pledge the
-- action was about, so - matching the existing precedent in
-- bulk_cleanup_event_contributions (202607260006) which nulls out
-- finance_audit_logs.pledge_id the same way - null out payment_id (stashing the
-- original id in metadata for traceability) instead of deleting the audit rows
-- outright, preserving the audit trail. This must happen before the
-- finance_audit_logs delete-by-pledge_id step already in the function too, but
-- more importantly, before pledge_payments is deleted.
-- Forward-only. Deliberately not applied automatically.

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
    update public.finance_audit_logs
      set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('deleted_payment_id', payment_id),
          payment_id = null
      where payment_id in (select id from public.pledge_payments where pledge_id = pledge.id);
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
