-- Per-event master automation pause and durable held-message lifecycle.
-- Forward-only. Deliberately not applied automatically.

alter table public.event_finance_automation_settings
  add column automatic_messaging_enabled boolean not null default true,
  add column automation_paused_at timestamptz,
  add column automation_paused_by uuid references auth.users(id) on delete set null;

alter table public.event_finance_automation_settings add constraint event_automation_pause_state_check check (
  (automatic_messaging_enabled and automation_paused_at is null and automation_paused_by is null)
  or (not automatic_messaging_enabled and automation_paused_at is not null)
);

alter table public.workflow_events drop constraint if exists workflow_events_status_check;
alter table public.workflow_events add constraint workflow_events_status_check
  check (status in ('pending','processing','processed','failed','held','cancelled'));
alter table public.pledge_reminders drop constraint if exists pledge_reminders_delivery_status_check;
alter table public.pledge_reminders add constraint pledge_reminders_delivery_status_check
  check (delivery_status in ('queued','processing','sent','delivered','read','failed','held','cancelled'));
alter table public.finance_automation_delivery_logs drop constraint if exists finance_automation_delivery_logs_delivery_status_check;
alter table public.finance_automation_delivery_logs add constraint finance_automation_delivery_logs_delivery_status_check
  check (delivery_status in ('queued','processing','sent','delivered','read','failed','held','cancelled'));
alter table public.pledge_reminder_schedules drop constraint if exists pledge_reminder_schedules_status_check;
alter table public.pledge_reminder_schedules add constraint pledge_reminder_schedules_status_check
  check (status in ('scheduled','recommended','queued','processing','sent','delivered','failed','cancelled','skipped','held'));
alter table public.automation_connector_deliveries drop constraint if exists automation_connector_deliveries_status_check;
alter table public.automation_connector_deliveries add constraint automation_connector_deliveries_status_check
  check (status in ('pending','sending','accepted','processing','completed','failed','skipped','cancelled','held'));

create index workflow_events_held_event_idx on public.workflow_events(event_id,created_at) where status='held';
create index pledge_reminders_held_event_idx on public.pledge_reminders(event_id,created_at) where delivery_status='held';
create index pledge_reminder_schedules_held_event_idx on public.pledge_reminder_schedules(event_id,scheduled_for) where status='held';
create index automation_connector_deliveries_held_event_idx on public.automation_connector_deliveries(event_id,created_at) where status='held';

alter table public.finance_audit_logs drop constraint if exists finance_audit_logs_action_check;
alter table public.finance_audit_logs add constraint finance_audit_logs_action_check check (action in (
  'pledge_created','pledge_updated','pledge_cancelled','pledge_restored','pledge_deleted_permanently','payment_recorded','payment_voided','payment_corrected',
  'reminder_requested','reminder_sent','reminder_failed','organiser_link_created','organiser_link_revoked','pledge_import_completed','bulk_contributions_cleanup',
  'contributor_guest_linked','contributor_guest_created','contributor_guest_card_upgraded','contributor_guest_card_downgrade_requested','contributor_guest_eligibility_lost','contributor_guest_sync_failed',
  'pledge_thank_you_requested','pledge_thank_you_sent','pledge_thank_you_failed','public_pledge_link_created','public_pledge_link_updated','public_pledge_link_revoked',
  'public_pledge_submitted','public_pledge_matched','public_pledge_review_required','acknowledgement_queued','acknowledgement_sent','acknowledgement_failed',
  'reminder_schedule_created','reminder_recommended','reminder_queued','reminder_skipped','reminder_schedules_cancelled','reminder_schedule_recalculated','reminder_no_date_manual','reminder_paused','reminder_resumed',
  'master_automation_paused','master_automation_resumed','held_automation_processed','held_automation_cancelled'
));

create or replace function public.hold_automatic_work_when_paused()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare enabled boolean;
begin
  select coalesce(s.automatic_messaging_enabled,true) into enabled
  from public.event_finance_automation_settings s where s.event_id=new.event_id;
  if coalesce(enabled,true) then return new; end if;
  if tg_table_name='workflow_events' and new.status in ('pending','failed') then new.status='held'; new.last_error='automation_paused';
  elsif tg_table_name='pledge_reminders' and new.requested_by is null and new.delivery_status in ('queued','failed') then new.delivery_status='held'; new.error_message='automation_paused'; new.next_retry_at=null;
  elsif tg_table_name='finance_automation_delivery_logs' and new.delivery_status in ('queued','processing','failed') then new.delivery_status='held'; new.error_message='automation_paused'; new.next_retry_at=null;
  elsif tg_table_name='pledge_reminder_schedules' and new.status in ('scheduled','recommended','queued','processing','failed','skipped') then new.status='held'; new.cancel_reason='automation_paused';
  elsif tg_table_name='automation_connector_deliveries' and new.event_type<>'connector.test' and new.status in ('pending','failed') then new.status='held'; new.last_error='automation_paused';
  end if;
  return new;
end $$;

create trigger workflow_events_master_pause before insert or update of status on public.workflow_events for each row execute function public.hold_automatic_work_when_paused();
create trigger pledge_reminders_master_pause before insert or update of delivery_status on public.pledge_reminders for each row execute function public.hold_automatic_work_when_paused();
create trigger finance_delivery_master_pause before insert or update of delivery_status on public.finance_automation_delivery_logs for each row execute function public.hold_automatic_work_when_paused();
create trigger pledge_schedules_master_pause before insert or update of status on public.pledge_reminder_schedules for each row execute function public.hold_automatic_work_when_paused();
create trigger make_deliveries_master_pause before insert or update of status on public.automation_connector_deliveries for each row execute function public.hold_automatic_work_when_paused();

create or replace function public.set_event_master_automation(target_event_id bigint, enabled boolean)
returns public.event_finance_automation_settings language plpgsql security definer set search_path=public,auth,pg_catalog as $$
declare previous boolean; result public.event_finance_automation_settings%rowtype;
begin
  if auth.uid() is null or not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  insert into public.event_finance_automation_settings(event_id) values(target_event_id) on conflict(event_id) do nothing;
  select automatic_messaging_enabled into previous from public.event_finance_automation_settings where event_id=target_event_id for update;
  update public.event_finance_automation_settings set automatic_messaging_enabled=enabled,
    automation_paused_at=case when enabled then null else now() end,
    automation_paused_by=case when enabled then null else auth.uid() end
  where event_id=target_event_id returning * into result;
  if not enabled then
    update public.workflow_events set status='held',last_error='automation_paused' where event_id=target_event_id and status in ('pending','failed');
    update public.pledge_reminders set delivery_status='held',error_message='automation_paused',next_retry_at=null where event_id=target_event_id and requested_by is null and delivery_status in ('queued','failed');
    update public.finance_automation_delivery_logs set delivery_status='held',error_message='automation_paused',next_retry_at=null where event_id=target_event_id and delivery_status in ('queued','failed');
    update public.pledge_reminder_schedules set status='held',cancel_reason='automation_paused' where event_id=target_event_id and status in ('scheduled','queued');
    update public.automation_connector_deliveries set status='held',last_error='automation_paused' where event_id=target_event_id and event_type<>'connector.test' and status in ('pending','failed');
  end if;
  insert into public.finance_audit_logs(event_id,actor_type,actor_user_id,action,previous_data,new_data)
  values(target_event_id,'authenticated_user',auth.uid(),case when enabled then 'master_automation_resumed' else 'master_automation_paused' end,
    jsonb_build_object('automatic_messaging_enabled',previous),jsonb_build_object('automatic_messaging_enabled',enabled));
  return result;
end $$;

create or replace function public.manage_held_automation(target_event_id bigint, requested_action text)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_catalog as $$
declare enabled boolean; affected integer:=0; n integer;
begin
  if auth.uid() is null or not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  if requested_action not in ('process','cancel') then raise exception 'Invalid action'; end if;
  select coalesce(automatic_messaging_enabled,true) into enabled from public.event_finance_automation_settings where event_id=target_event_id for update;
  if requested_action='process' and not coalesce(enabled,true) then raise exception 'Automation must be active'; end if;
  if requested_action='process' then
    update public.workflow_events set status='pending',available_at=now(),last_error=null where event_id=target_event_id and status='held'; get diagnostics n=row_count; affected:=affected+n;
    update public.pledge_reminders set delivery_status='queued',error_message=null where event_id=target_event_id and delivery_status='held'; get diagnostics n=row_count; affected:=affected+n;
    update public.finance_automation_delivery_logs set delivery_status='queued',error_message=null where event_id=target_event_id and delivery_status='held'; get diagnostics n=row_count; affected:=affected+n;
    update public.pledge_reminder_schedules set status='scheduled',cancel_reason=null where event_id=target_event_id and status='held'; get diagnostics n=row_count; affected:=affected+n;
    update public.automation_connector_deliveries set status='pending',next_attempt_at=now(),last_error=null where event_id=target_event_id and status='held'; get diagnostics n=row_count; affected:=affected+n;
  else
    update public.workflow_events set status='cancelled',last_error='cancelled_while_automation_paused',processed_at=now() where event_id=target_event_id and status='held'; get diagnostics n=row_count; affected:=affected+n;
    update public.pledge_reminders set delivery_status='cancelled',error_message='cancelled_while_automation_paused' where event_id=target_event_id and delivery_status='held'; get diagnostics n=row_count; affected:=affected+n;
    update public.finance_automation_delivery_logs set delivery_status='cancelled',error_message='cancelled_while_automation_paused' where event_id=target_event_id and delivery_status='held'; get diagnostics n=row_count; affected:=affected+n;
    update public.pledge_reminder_schedules set status='cancelled',cancelled_at=now(),cancel_reason='cancelled_while_automation_paused' where event_id=target_event_id and status='held'; get diagnostics n=row_count; affected:=affected+n;
    update public.automation_connector_deliveries set status='cancelled',last_error='cancelled_while_automation_paused' where event_id=target_event_id and status='held'; get diagnostics n=row_count; affected:=affected+n;
  end if;
  insert into public.finance_audit_logs(event_id,actor_type,actor_user_id,action,new_data)
  values(target_event_id,'authenticated_user',auth.uid(),case when requested_action='process' then 'held_automation_processed' else 'held_automation_cancelled' end,jsonb_build_object('affected_count',affected));
  return jsonb_build_object('affected',affected,'action',requested_action);
end $$;

create or replace function public.event_held_automation_count(target_event_id bigint)
returns bigint language plpgsql stable security definer set search_path=public,auth,pg_catalog as $$
declare result bigint;
begin
  if auth.uid() is null or not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  select
    (select count(*) from public.workflow_events where event_id=target_event_id and status='held')+
    (select count(*) from public.pledge_reminders where event_id=target_event_id and delivery_status='held')+
    (select count(*) from public.finance_automation_delivery_logs where event_id=target_event_id and delivery_status='held')+
    (select count(*) from public.pledge_reminder_schedules where event_id=target_event_id and status='held')+
    (select count(*) from public.automation_connector_deliveries where event_id=target_event_id and status='held') into result;
  return result;
end $$;

revoke all on function public.set_event_master_automation(bigint,boolean),public.manage_held_automation(bigint,text),public.event_held_automation_count(bigint) from public,anon,authenticated;
grant execute on function public.set_event_master_automation(bigint,boolean),public.manage_held_automation(bigint,text),public.event_held_automation_count(bigint) to authenticated;
