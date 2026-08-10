-- Purge meeting-invitation delivery history when a cancelled, financial-history-free
-- pledge is permanently deleted (gap: meeting_invitation_deliveries.pledge_id gained an
-- ON DELETE RESTRICT FK after this RPC was written), add a preview function so the UI
-- can show exactly what will be removed, and tighten authorization to admin-only to
-- match event permanent deletion.
-- Forward-only. Deliberately not applied automatically.

create or replace function public.preview_pledge_permanent_deletion(target_pledge_id bigint)
returns jsonb language plpgsql security definer
set search_path = public, auth, pg_catalog
as $$
declare pledge public.event_pledges%rowtype; protected boolean;
begin
  select * into pledge from public.event_pledges where id = target_pledge_id;
  if not found then raise exception 'Pledge not found'; end if;
  if not public.is_active_admin() then raise exception 'Not authorized'; end if;
  select has_protected_financial_history into protected
    from public.event_pledge_financial_summary where id = pledge.id;
  return jsonb_build_object(
    'pledgeId', pledge.id,
    'fullName', pledge.full_name,
    'isCancelled', pledge.cancelled_at is not null,
    'hasProtectedFinancialHistory', coalesce(protected, false),
    'paymentRows', (select count(*) from public.pledge_payments where pledge_id = pledge.id),
    'reminderHistory', (select count(*) from public.pledge_reminders where pledge_id = pledge.id),
    'meetingInvitations', (select count(*) from public.meeting_invitation_deliveries where pledge_id = pledge.id),
    'auditLogs', (select count(*) from public.finance_audit_logs where pledge_id = pledge.id)
  );
end;
$$;
revoke all on function public.preview_pledge_permanent_deletion(bigint) from public, anon;
grant execute on function public.preview_pledge_permanent_deletion(bigint) to authenticated;

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
  if not public.is_active_admin() then raise exception 'Not authorized'; end if;
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

  -- Operational reminder, meeting-invitation, and pledge audit rows may be removed;
  -- payment and receipt history is protected above. The linked guest is intentionally
  -- never deleted.
  delete from public.meeting_invitation_deliveries where pledge_id = pledge.id;
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
