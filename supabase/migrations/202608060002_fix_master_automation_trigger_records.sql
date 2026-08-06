-- Fix polymorphic NEW record access in the per-event master automation triggers.
-- Forward-only. Deliberately not applied automatically.

drop trigger if exists workflow_events_master_pause on public.workflow_events;
drop trigger if exists pledge_reminders_master_pause on public.pledge_reminders;
drop trigger if exists finance_delivery_master_pause on public.finance_automation_delivery_logs;
drop trigger if exists pledge_schedules_master_pause on public.pledge_reminder_schedules;
drop trigger if exists make_deliveries_master_pause on public.automation_connector_deliveries;
drop function if exists public.hold_automatic_work_when_paused();

create or replace function public.hold_workflow_event_when_automation_paused()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare enabled boolean;
begin
  select coalesce(setting.automatic_messaging_enabled,true) into enabled
  from public.event_finance_automation_settings setting where setting.event_id=new.event_id;
  if not coalesce(enabled,true) and new.status in ('pending','failed') then
    new.status:='held';
    new.last_error:='automation_paused';
  end if;
  return new;
end $$;

create or replace function public.hold_pledge_reminder_when_automation_paused()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare enabled boolean;
begin
  select coalesce(setting.automatic_messaging_enabled,true) into enabled
  from public.event_finance_automation_settings setting where setting.event_id=new.event_id;
  -- requested_by is a real pledge_reminders column. NULL denotes system-created work.
  if not coalesce(enabled,true) and new.requested_by is null and new.delivery_status in ('queued','failed') then
    new.delivery_status:='held';
    new.error_message:='automation_paused';
    new.next_retry_at:=null;
  end if;
  return new;
end $$;

create or replace function public.hold_finance_delivery_when_automation_paused()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare enabled boolean;
begin
  select coalesce(setting.automatic_messaging_enabled,true) into enabled
  from public.event_finance_automation_settings setting where setting.event_id=new.event_id;
  if not coalesce(enabled,true) and new.delivery_status in ('queued','processing','failed') then
    new.delivery_status:='held';
    new.error_message:='automation_paused';
    new.next_retry_at:=null;
  end if;
  return new;
end $$;

create or replace function public.hold_pledge_schedule_when_automation_paused()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare enabled boolean;
begin
  select coalesce(setting.automatic_messaging_enabled,true) into enabled
  from public.event_finance_automation_settings setting where setting.event_id=new.event_id;
  if not coalesce(enabled,true) and new.status in ('scheduled','recommended','queued','processing','failed','skipped') then
    new.status:='held';
    new.cancel_reason:='automation_paused';
  end if;
  return new;
end $$;

create or replace function public.hold_make_delivery_when_automation_paused()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare enabled boolean;
begin
  select coalesce(setting.automatic_messaging_enabled,true) into enabled
  from public.event_finance_automation_settings setting where setting.event_id=new.event_id;
  if not coalesce(enabled,true) and new.event_type<>'connector.test' and new.status in ('pending','failed') then
    new.status:='held';
    new.last_error:='automation_paused';
  end if;
  return new;
end $$;

-- BEFORE triggers operate on NEW for both INSERT and UPDATE. None reads OLD, so
-- INSERT cannot reference an unassigned OLD record and UPDATE remains idempotent.
create trigger workflow_events_master_pause before insert or update of status on public.workflow_events
for each row execute function public.hold_workflow_event_when_automation_paused();
create trigger pledge_reminders_master_pause before insert or update of delivery_status on public.pledge_reminders
for each row execute function public.hold_pledge_reminder_when_automation_paused();
create trigger finance_delivery_master_pause before insert or update of delivery_status on public.finance_automation_delivery_logs
for each row execute function public.hold_finance_delivery_when_automation_paused();
create trigger pledge_schedules_master_pause before insert or update of status on public.pledge_reminder_schedules
for each row execute function public.hold_pledge_schedule_when_automation_paused();
create trigger make_deliveries_master_pause before insert or update of status on public.automation_connector_deliveries
for each row execute function public.hold_make_delivery_when_automation_paused();

revoke all on function public.hold_workflow_event_when_automation_paused(),
  public.hold_pledge_reminder_when_automation_paused(),
  public.hold_finance_delivery_when_automation_paused(),
  public.hold_pledge_schedule_when_automation_paused(),
  public.hold_make_delivery_when_automation_paused()
from public,anon,authenticated;
