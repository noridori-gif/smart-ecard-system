-- Phase 4A financial notification operational state and SQL-authoritative summary.
-- Deliberately not applied automatically.

alter table public.pledge_reminders
  drop constraint if exists pledge_reminders_delivery_status_check;
alter table public.pledge_reminders
  add constraint pledge_reminders_delivery_status_check
  check (delivery_status in ('queued','processing','sent','delivered','read','failed'));
alter table public.pledge_reminders
  add column if not exists retry_count integer not null default 0 check (retry_count between 0 and 3),
  add column if not exists max_attempts integer not null default 3 check (max_attempts = 3),
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists failure_type text check (failure_type is null or failure_type in ('configuration','validation','provider','timeout','network','unexpected'));

update public.pledge_reminders
set retry_count = greatest(0, least(coalesce(retry_count, 0), 3)),
    max_attempts = 3
where retry_count is null
   or retry_count < 0
   or retry_count > 3
   or max_attempts is distinct from 3;
alter table public.pledge_reminders
  drop constraint if exists pledge_reminders_retry_count_nonnegative_check,
  drop constraint if exists pledge_reminders_max_attempts_fixed_check,
  drop constraint if exists pledge_reminders_retry_within_attempts_check;
alter table public.pledge_reminders
  add constraint pledge_reminders_retry_count_nonnegative_check check (retry_count >= 0),
  add constraint pledge_reminders_max_attempts_fixed_check check (max_attempts = 3),
  add constraint pledge_reminders_retry_within_attempts_check check (retry_count <= max_attempts);

drop index if exists public.pledge_reminders_provider_message_idx;
create unique index pledge_reminders_provider_message_idx
  on public.pledge_reminders(channel,provider_message_id)
  where provider_message_id is not null;
create index if not exists pledge_reminders_retry_due_idx
  on public.pledge_reminders(next_retry_at)
  where delivery_status='failed' and retry_count < 3 and next_retry_at is not null;

alter table public.finance_automation_delivery_logs
  drop constraint if exists finance_automation_delivery_logs_delivery_status_check;
alter table public.finance_automation_delivery_logs
  add constraint finance_automation_delivery_logs_delivery_status_check
  check (delivery_status in ('queued','processing','sent','delivered','read','failed'));
alter table public.finance_automation_delivery_logs
  add column if not exists retry_count integer not null default 0 check (retry_count between 0 and 3),
  add column if not exists max_attempts integer not null default 3 check (max_attempts = 3),
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists failure_type text check (failure_type is null or failure_type in ('configuration','validation','provider','timeout','network','unexpected'));

update public.finance_automation_delivery_logs
set retry_count = greatest(0, least(coalesce(retry_count, 0), 3)),
    max_attempts = 3
where retry_count is null
   or retry_count < 0
   or retry_count > 3
   or max_attempts is distinct from 3;
alter table public.finance_automation_delivery_logs
  drop constraint if exists finance_automation_delivery_retry_count_nonnegative_check,
  drop constraint if exists finance_automation_delivery_max_attempts_fixed_check,
  drop constraint if exists finance_automation_delivery_retry_within_attempts_check;
alter table public.finance_automation_delivery_logs
  add constraint finance_automation_delivery_retry_count_nonnegative_check check (retry_count >= 0),
  add constraint finance_automation_delivery_max_attempts_fixed_check check (max_attempts = 3),
  add constraint finance_automation_delivery_retry_within_attempts_check check (retry_count <= max_attempts);

drop index if exists public.finance_automation_delivery_provider_idx;
create unique index finance_automation_delivery_provider_idx
  on public.finance_automation_delivery_logs(channel,provider_message_id)
  where provider_message_id is not null;
create index if not exists finance_automation_delivery_retry_due_idx
  on public.finance_automation_delivery_logs(next_retry_at)
  where delivery_status='failed' and retry_count < 3 and next_retry_at is not null;

create or replace function public.get_financial_daily_summary(
  target_event_id bigint,
  summary_date date
) returns jsonb language plpgsql security definer
set search_path=public,auth,pg_catalog
as $$
declare result jsonb;
begin
  if summary_date is null then
    raise exception 'Summary date is required';
  end if;
  if not exists(
    select 1 from public.events
    where id=target_event_id and archived_at is null
  ) then
    raise exception 'Event not found';
  end if;
  if auth.role() <> 'service_role'
     and not public.can_manage_event_finance(target_event_id) then
    raise exception 'Not authorized';
  end if;

  with pledge_totals as (
    select
      coalesce(sum(s.pledged_amount) filter(where s.calculated_status<>'cancelled'),0::numeric) total_pledged,
      coalesce(sum(s.total_paid) filter(where s.calculated_status<>'cancelled'),0::numeric) total_collected,
      coalesce(sum(s.balance) filter(where s.calculated_status<>'cancelled'),0::numeric) outstanding_balance,
      count(*) filter(where s.calculated_status in ('pledged','partial') and s.balance>0) outstanding_contributors,
      count(*) filter(where s.calculated_status='completed') completed_pledges
    from public.event_pledge_financial_summary s where s.event_id=target_event_id
  ), day_totals as (
    select coalesce(sum(pay.amount),0::numeric) daily_collected,
      count(*) transaction_count,count(distinct pay.pledge_id) contributors_count
    from public.pledge_payments pay
    join public.event_pledges pledge on pledge.id=pay.pledge_id
    where pledge.event_id=target_event_id and pay.payment_date=summary_date and pay.voided_at is null
  ), top_contributor as (
    select pledge.full_name,sum(pay.amount) amount
    from public.pledge_payments pay join public.event_pledges pledge on pledge.id=pay.pledge_id
    where pledge.event_id=target_event_id and pay.payment_date=summary_date and pay.voided_at is null
    group by pledge.id,pledge.full_name order by sum(pay.amount) desc,pledge.id limit 1
  )
  select jsonb_build_object(
    'date',summary_date,'dailyCollected',day.daily_collected,'transactionCount',day.transaction_count,
    'contributorsCount',day.contributors_count,'totalPledged',totals.total_pledged,
    'totalCollected',totals.total_collected,'outstandingBalance',totals.outstanding_balance,
    'collectionPercentage',case when totals.total_pledged=0 then 0 else round(100*totals.total_collected/totals.total_pledged,2) end,
    'outstandingContributors',totals.outstanding_contributors,'completedPledges',totals.completed_pledges,
    'topContributor',(select case when top.full_name is null then null else jsonb_build_object('name',top.full_name,'amount',top.amount) end from top_contributor top)
  ) into result from pledge_totals totals cross join day_totals day;
  return result;
end;
$$;
revoke all on function public.get_financial_daily_summary(bigint,date)
  from public,anon,authenticated,service_role;
grant execute on function public.get_financial_daily_summary(bigint,date) to authenticated,service_role;

revoke all on public.pledge_reminders from public,anon,service_role;
revoke all on public.finance_automation_delivery_logs from public,anon,service_role;
grant select,insert,update on public.pledge_reminders to service_role;
grant select,insert,update on public.finance_automation_delivery_logs to service_role;
