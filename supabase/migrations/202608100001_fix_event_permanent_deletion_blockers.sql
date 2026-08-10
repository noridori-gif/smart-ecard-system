-- Extend permanent event deletion to purge the newer workflow-automation
-- and public-pledge-link tables, which acquired ON DELETE RESTRICT foreign
-- keys to events after delete_event_permanently() was originally written.
-- Forward-only. Deliberately not applied automatically.

create or replace function public.preview_event_permanent_deletion(target_event_id bigint)
returns jsonb language plpgsql security definer
set search_path = public, auth, pg_catalog
as $$
declare target public.events%rowtype;
begin
  if not public.is_active_admin() then raise exception 'Not authorized'; end if;
  select * into target from public.events where id = target_event_id;
  if not found then raise exception 'Event not found'; end if;
  return jsonb_build_object(
    'eventId', target.id,
    'eventTitle', coalesce(target.title, ''),
    'guests', (select count(*) from public.guests where event_id=target.id),
    'invitations', (select count(*) from public.invitations where event_id=target.id),
    'pledges', (select count(*) from public.event_pledges where event_id=target.id),
    'validPayments', (select count(*) from public.pledge_payments pay join public.event_pledges p on p.id=pay.pledge_id where p.event_id=target.id and pay.voided_at is null),
    'voidedPayments', (select count(*) from public.pledge_payments pay join public.event_pledges p on p.id=pay.pledge_id where p.event_id=target.id and pay.voided_at is not null),
    'receipts', (select count(*) from public.finance_receipt_verifications verification join public.pledge_payments pay on pay.id=verification.payment_id join public.event_pledges p on p.id=pay.pledge_id where p.event_id=target.id),
    'committeeLinks', (select count(*) from public.event_finance_access_links where event_id=target.id),
    'reminderHistory', (select count(*) from public.pledge_reminders where event_id=target.id),
    'automationDeliveries', (select count(*) from public.finance_automation_delivery_logs where event_id=target.id),
    'wishes', (select count(*) from public.event_wishes where event_id=target.id),
    'guestImportHistory', (select count(*) from public.guest_import_history where event_id=target.id),
    'financeTargets', (select count(*) from public.event_finance_targets where event_id=target.id),
    'whatsappMessageLogs', (select count(*) from public.whatsapp_message_logs log
      join public.invitations invitation on invitation.id=log.invitation_id
      where invitation.event_id=target.id),
    'financeAuditLogs', (select count(*) from public.finance_audit_logs where event_id=target.id),
    'financeAutomationSettings', (select count(*) from public.event_finance_automation_settings where event_id=target.id),
    'workflowEvents', (select count(*) from public.workflow_events where event_id=target.id),
    'publicPledgeLinks', (select count(*) from public.public_pledge_links where event_id=target.id),
    'publicPledgeReviews', (select count(*) from public.public_pledge_reviews where event_id=target.id),
    'pledgeReminderSettings', (select count(*) from public.event_pledge_reminder_settings where event_id=target.id)
  );
end;
$$;

create or replace function public.delete_event_permanently(
  target_event_id bigint,
  expected_event_title text,
  second_confirmation boolean
) returns jsonb language plpgsql security definer
set search_path = public, auth, pg_catalog
as $$
declare target public.events%rowtype; summary jsonb;
begin
  if not public.is_active_admin() then raise exception 'Not authorized'; end if;
  if second_confirmation is not true then raise exception 'Confirmation required'; end if;
  select * into target from public.events where id=target_event_id for update;
  if not found then raise exception 'Event not found'; end if;
  if expected_event_title is distinct from coalesce(target.title,'') then
    raise exception 'Event title confirmation does not match';
  end if;
  summary := public.preview_event_permanent_deletion(target_event_id);

  delete from public.finance_receipt_verifications where payment_id in (
    select pay.id from public.pledge_payments pay join public.event_pledges p on p.id=pay.pledge_id where p.event_id=target_event_id
  );
  delete from public.finance_automation_delivery_logs where event_id=target_event_id;
  delete from public.pledge_reminders where event_id=target_event_id;
  delete from public.finance_audit_logs where event_id=target_event_id;
  delete from public.pledge_payments where pledge_id in (select id from public.event_pledges where event_id=target_event_id);
  delete from public.event_pledges where event_id=target_event_id;
  delete from public.event_finance_access_links where event_id=target_event_id;
  delete from public.event_finance_automation_settings where event_id=target_event_id;
  delete from public.event_finance_targets where event_id=target_event_id;
  delete from public.whatsapp_message_logs where invitation_id in (select id from public.invitations where event_id=target_event_id);
  delete from public.event_wishes where event_id=target_event_id;
  delete from public.invitations where event_id=target_event_id;
  delete from public.guest_import_history where event_id=target_event_id;
  delete from public.guests where event_id=target_event_id;

  -- Newer workflow-automation / public-pledge-link tables (added after this
  -- function was first written). Reviews must go before links: reviews.link_id
  -- is ON DELETE RESTRICT against public_pledge_links.
  delete from public.public_pledge_reviews where event_id=target_event_id;
  delete from public.public_pledge_links where event_id=target_event_id;
  delete from public.event_pledge_reminder_settings where event_id=target_event_id;
  delete from public.workflow_events where event_id=target_event_id;

  insert into public.destructive_action_audit(
    action,event_id,event_title,actor_user_id,summary
  ) values (
    'event_deleted_permanently',target.id,coalesce(target.title,''),auth.uid(),summary
  );
  delete from public.events where id=target_event_id;

  return summary || jsonb_build_object('deleted',true);
end;
$$;
