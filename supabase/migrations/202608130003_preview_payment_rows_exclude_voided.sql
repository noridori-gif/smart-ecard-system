-- Consistency tweak: preview_pledge_permanent_deletion's "paymentRows" stat
-- (shown as "Payment records: N" in ContributorPermanentDeleteDialog's impact
-- grid) still counted voided payment rows, while payment_row_count and
-- has_protected_financial_history on the view were already switched to
-- voided_at is null in the previous migration. Apply the same filter here so
-- voided payments never appear in this count anywhere in the dialog.
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
    'paymentRows', (select count(*) from public.pledge_payments where pledge_id = pledge.id and voided_at is null),
    'reminderHistory', (select count(*) from public.pledge_reminders where pledge_id = pledge.id),
    'meetingInvitations', (select count(*) from public.meeting_invitation_deliveries where pledge_id = pledge.id),
    'auditLogs', (select count(*) from public.finance_audit_logs where pledge_id = pledge.id)
  );
end;
$$;
revoke all on function public.preview_pledge_permanent_deletion(bigint) from public, anon;
grant execute on function public.preview_pledge_permanent_deletion(bigint) to authenticated;
