-- Organizer-friendly automation settings and idempotent pledge acknowledgements.
-- Forward-only. Deliberately not applied automatically.

alter table public.event_finance_automation_settings
  add column if not exists pledge_acknowledgement_mode text not null default 'off'
  check (pledge_acknowledgement_mode in ('off','preview','automatic'));

alter table public.automation_connector_deliveries
  add column if not exists callback_token_hash text
  check (callback_token_hash is null or callback_token_hash ~ '^[a-f0-9]{64}$');

alter table public.workflow_events drop constraint if exists workflow_events_event_type_check;
alter table public.workflow_events add constraint workflow_events_event_type_check check (event_type in (
  'pledge.submitted','pledge.created','pledge.updated','payment.recorded','payment.updated','payment.completed',
  'message.acknowledgement.requested','pledge.reminder.schedule_requested','pledge.reminder.ready',
  'pledge.reminder.send_requested','pledge.reminder.cancel_requested','owner.summary.daily_requested'
));

create or replace function public.save_simple_automation_settings(
  target_event_id bigint,
  reminder_mode text,
  acknowledgement_mode text,
  summary_enabled boolean,
  summary_phone text,
  summary_channel text,
  local_summary_time time,
  local_timezone text default 'Africa/Dar_es_Salaam'
) returns public.event_finance_automation_settings
language plpgsql security definer set search_path=public,auth,pg_catalog as $$
declare result public.event_finance_automation_settings%rowtype; utc_time time;
begin
  if not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  if reminder_mode not in ('off','manual','automatic') then raise exception 'Invalid reminder mode'; end if;
  if acknowledgement_mode not in ('off','preview','automatic') then raise exception 'Invalid acknowledgement mode'; end if;
  if summary_channel not in ('sms','whatsapp','both') then raise exception 'Invalid summary channel'; end if;
  if local_timezone <> 'Africa/Dar_es_Salaam' then raise exception 'Unsupported timezone'; end if;
  utc_time:=(((current_date+local_summary_time) at time zone local_timezone) at time zone 'UTC')::time;

  insert into public.event_finance_automation_settings(
    event_id,reminders_enabled,reminder_frequency,pledge_acknowledgement_mode,
    daily_summary_enabled,owner_summary_phone,daily_summary_channel,daily_summary_time
  ) values (
    target_event_id,reminder_mode<>'off',case when reminder_mode='automatic' then 'weekly' else 'manual' end,
    acknowledgement_mode,summary_enabled,nullif(btrim(summary_phone),''),summary_channel,utc_time
  ) on conflict(event_id) do update set
    reminders_enabled=excluded.reminders_enabled,
    reminder_frequency=case when reminder_mode='automatic' and event_finance_automation_settings.reminder_frequency='manual' then 'weekly' when reminder_mode<>'automatic' then 'manual' else event_finance_automation_settings.reminder_frequency end,
    pledge_acknowledgement_mode=excluded.pledge_acknowledgement_mode,
    daily_summary_enabled=excluded.daily_summary_enabled,
    owner_summary_phone=excluded.owner_summary_phone,
    daily_summary_channel=excluded.daily_summary_channel,
    daily_summary_time=excluded.daily_summary_time
  returning * into result;

  insert into public.event_pledge_reminder_settings(event_id,reminder_mode,is_enabled)
  values(target_event_id,case when reminder_mode='automatic' then 'automatic' else 'manual' end,reminder_mode='automatic')
  on conflict(event_id) do update set
    reminder_mode=excluded.reminder_mode,is_enabled=excluded.is_enabled;
  insert into public.workflow_events(event_id,event_type,entity_type,source,payload,idempotency_key)
  values(target_event_id,'pledge.reminder.schedule_requested','event','manager',jsonb_build_object('event_id',target_event_id,'source','simple_settings'),'simple-reminder-settings:'||target_event_id||':'||txid_current())
  on conflict(idempotency_key) do nothing;
  return result;
end $$;

create or replace function public.enqueue_automatic_pledge_acknowledgement()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare mode text;
begin
  select pledge_acknowledgement_mode into mode
  from public.event_finance_automation_settings where event_id=new.event_id;
  if mode='automatic' and new.normalized_phone ~ '^255[67][0-9]{8}$' then
    insert into public.workflow_events(event_id,event_type,entity_type,entity_id,source,payload,idempotency_key)
    values(new.event_id,'message.acknowledgement.requested','pledge',new.id::text,new.source,
      jsonb_build_object('pledge_id',new.id,'language',coalesce((select language from public.events where id=new.event_id),'sw')),
      'pledge-acknowledgement:'||new.id)
    on conflict(idempotency_key) do nothing;
  end if;
  return new;
exception when others then
  -- Messaging infrastructure must never roll back a successfully committed pledge.
  return new;
end $$;

drop trigger if exists enqueue_automatic_pledge_acknowledgement on public.event_pledges;
create trigger enqueue_automatic_pledge_acknowledgement
after insert on public.event_pledges for each row
execute function public.enqueue_automatic_pledge_acknowledgement();

create or replace function public.guard_pledge_acknowledgement_records()
returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare mode text; phone text;
begin
  select pledge_acknowledgement_mode into mode from public.event_finance_automation_settings where event_id=new.event_id;
  if tg_table_name='workflow_events' then
    if new.event_type<>'message.acknowledgement.requested' then return new; end if;
    select normalized_phone into phone from public.event_pledges where id=(new.payload->>'pledge_id')::bigint and event_id=new.event_id;
    if mode<>'automatic' or phone is null or phone !~ '^255[67][0-9]{8}$' then return null; end if;
    if exists(select 1 from public.workflow_events where event_id=new.event_id and event_type=new.event_type and entity_id=new.entity_id) then return null; end if;
  elsif new.action='acknowledgement_queued' and mode<>'automatic' then return null;
  end if;
  return new;
end $$;

drop trigger if exists guard_pledge_acknowledgement_workflow on public.workflow_events;
create trigger guard_pledge_acknowledgement_workflow before insert on public.workflow_events
for each row execute function public.guard_pledge_acknowledgement_records();
drop trigger if exists guard_pledge_acknowledgement_audit on public.finance_audit_logs;
create trigger guard_pledge_acknowledgement_audit before insert on public.finance_audit_logs
for each row execute function public.guard_pledge_acknowledgement_records();

revoke all on function public.save_simple_automation_settings(bigint,text,text,boolean,text,text,time,text) from public,anon;
grant execute on function public.save_simple_automation_settings(bigint,text,text,boolean,text,text,time,text) to authenticated;
