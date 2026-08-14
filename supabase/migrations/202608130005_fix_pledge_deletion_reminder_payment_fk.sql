-- Bug: same pattern as 202608130004, one FK further out. pledge_reminders has
-- its own nullable FK to pledge_payments(id) - originating_payment_id, added in
-- 202608050003 for automatic payment acknowledgements - also on delete restrict
-- (pledge_reminders_originating_payment_id_fkey). This pledge's pledge_reminders
-- rows are already deleted a few statements later by pledge_id, but that happens
-- AFTER pledge_payments is deleted, so any reminder still referencing one of
-- this pledge's payments blocked the delete - reproduced on Adam Adam's second
-- force-delete attempt. Transaction rolled back, no data was lost.
--
-- Fix: null out originating_payment_id for this pledge's reminders before
-- pledge_payments is deleted. Unlike finance_audit_logs, pledge_reminders has no
-- metadata/notes column to stash the original value into, and the row itself is
-- deleted outright moments later in this same function regardless - so there's
-- nothing to preserve, just the FK to clear so the payments delete can proceed.
--
-- An exhaustive audit of every migration found exactly three FK constraints
-- anywhere referencing pledge_payments(id): finance_receipt_verifications.payment_id
-- (its primary key, not-null, already deleted first), finance_audit_logs.payment_id
-- (nullable, fixed in 202608130004), and this one. No others exist.
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
    update public.pledge_reminders
      set originating_payment_id = null
      where originating_payment_id in (select id from public.pledge_payments where pledge_id = pledge.id);
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
