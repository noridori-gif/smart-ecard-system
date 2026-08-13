-- Admin-only override: allow permanently_delete_event_pledge to also remove a
-- cancelled pledge's payment history (and its receipt verifications) in the same
-- transaction, for test-data cleanup / correcting mistakes. Still admin-only,
-- still requires the pledge to already be cancelled, still requires the typed
-- full-name confirmation. Ordinary (non-override) deletion behavior is unchanged.
-- Forward-only. Deliberately not applied automatically.

alter table public.finance_audit_logs drop constraint if exists finance_audit_logs_action_check;
alter table public.finance_audit_logs add constraint finance_audit_logs_action_check check (action in (
  'pledge_created','pledge_updated','pledge_cancelled','pledge_restored','pledge_deleted_permanently','payment_recorded','payment_voided','payment_corrected',
  'reminder_requested','reminder_sent','reminder_failed','organiser_link_created','organiser_link_revoked','pledge_import_completed','bulk_contributions_cleanup',
  'contributor_guest_linked','contributor_guest_created','contributor_guest_card_upgraded','contributor_guest_card_downgrade_requested','contributor_guest_eligibility_lost','contributor_guest_sync_failed',
  'pledge_thank_you_requested','pledge_thank_you_sent','pledge_thank_you_failed','public_pledge_link_created','public_pledge_link_updated','public_pledge_link_revoked',
  'public_pledge_submitted','public_pledge_matched','public_pledge_review_required','acknowledgement_queued','acknowledgement_sent','acknowledgement_failed',
  'reminder_schedule_created','reminder_recommended','reminder_queued','reminder_skipped','reminder_schedules_cancelled','reminder_schedule_recalculated','reminder_no_date_manual','reminder_paused','reminder_resumed',
  'master_automation_paused','master_automation_resumed','held_automation_processed','held_automation_cancelled',
  'expense_recorded','expense_corrected','expense_voided',
  'pledge_deleted_permanently_with_payments'
));

drop function if exists public.permanently_delete_event_pledge(bigint, text);

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

  if exists (select 1 from public.pledge_payments where pledge_id = pledge.id) then
    if not force_delete_payments then
      raise exception 'Cannot permanently delete because payment history exists.';
    end if;
  end if;

  if force_delete_payments then
    select count(*), coalesce(sum(amount), 0) into deleted_payment_count, deleted_payment_total
    from public.pledge_payments where pledge_id = pledge.id;

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
