-- Schedule owner daily summaries through the shared workflow queue.

alter table public.workflow_events drop constraint if exists workflow_events_event_type_check;
alter table public.workflow_events add constraint workflow_events_event_type_check check (event_type in (
  'pledge.created','pledge.updated','payment.recorded','payment.updated','message.acknowledgement.requested',
  'pledge.reminder.schedule_requested','pledge.reminder.ready','pledge.reminder.send_requested','pledge.reminder.cancel_requested',
  'owner.summary.daily_requested'
));

create or replace function public.schedule_owner_daily_summary(target_event_id bigint)
returns public.workflow_events language plpgsql security definer set search_path=public,pg_catalog as $$
declare
  setting public.event_finance_automation_settings%rowtype;
  scheduled_at timestamptz;
  summary_day date;
  result public.workflow_events%rowtype;
begin
  select * into setting from public.event_finance_automation_settings where event_id=target_event_id;

  if setting.event_id is null or not setting.daily_summary_enabled or setting.owner_summary_phone is null then
    update public.workflow_events
       set status='processed',processed_at=now(),last_error=null,
           payload=payload||jsonb_build_object('cancelled_reason','daily_summary_disabled')
     where event_id=target_event_id and event_type='owner.summary.daily_requested'
       and status='pending' and attempt_count=0;
    return null;
  end if;

  summary_day:=current_date;
  scheduled_at:=summary_day::timestamptz+setting.daily_summary_time;
  if scheduled_at<=now() then
    summary_day:=summary_day+1;
    scheduled_at:=summary_day::timestamptz+setting.daily_summary_time;
  end if;

  insert into public.workflow_events(
    event_id,event_type,entity_type,entity_id,source,payload,idempotency_key,available_at
  ) values (
    target_event_id,'owner.summary.daily_requested','event',target_event_id::text,'system',
    jsonb_build_object('event_id',target_event_id,'summary_date',summary_day,'scheduled_for',scheduled_at),
    'daily-summary:'||target_event_id||':'||summary_day,scheduled_at
  )
  on conflict(idempotency_key) do update
    set available_at=excluded.available_at,payload=excluded.payload
    where workflow_events.status='pending' and workflow_events.attempt_count=0
  returning * into result;
  return result;
end $$;

create or replace function public.enqueue_owner_daily_summary_after_settings_save()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
begin
  perform public.schedule_owner_daily_summary(new.event_id);
  return new;
end $$;

drop trigger if exists enqueue_owner_daily_summary_after_settings_save on public.event_finance_automation_settings;
create trigger enqueue_owner_daily_summary_after_settings_save
after insert or update of daily_summary_enabled,daily_summary_channel,daily_summary_time,owner_summary_phone
on public.event_finance_automation_settings for each row
execute function public.enqueue_owner_daily_summary_after_settings_save();

revoke all on function public.schedule_owner_daily_summary(bigint) from public,anon,authenticated;
grant execute on function public.schedule_owner_daily_summary(bigint) to service_role;

-- Backfill the next occurrence for settings that were enabled before this migration.
select public.schedule_owner_daily_summary(event_id)
from public.event_finance_automation_settings
where daily_summary_enabled and owner_summary_phone is not null;
