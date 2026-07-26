-- Event finance budget and contribution deadline. Do not apply automatically.

create table public.event_finance_targets (
  event_id bigint primary key references public.events(id) on delete restrict,
  budget_amount numeric(18,2) check (budget_amount is null or budget_amount > 0),
  contribution_deadline date,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger event_finance_targets_updated_at
before update on public.event_finance_targets
for each row execute function public.set_finance_updated_at();

alter table public.event_finance_targets enable row level security;
create policy event_finance_targets_manage on public.event_finance_targets
for all to authenticated
using (public.can_manage_event_finance(event_id))
with check (public.can_manage_event_finance(event_id));

revoke all on public.event_finance_targets from anon, authenticated, service_role;
grant select, delete on public.event_finance_targets to authenticated;
grant insert(event_id,budget_amount,contribution_deadline) on public.event_finance_targets to authenticated;
grant update(budget_amount,contribution_deadline) on public.event_finance_targets to authenticated;
grant select on public.event_finance_targets to service_role;

alter table public.event_finance_automation_settings
add column allow_after_deadline boolean not null default false;

drop function public.get_event_finance_summary(bigint);
create function public.get_event_finance_summary(target_event_id bigint)
returns table(
  total_pledged numeric, total_collected numeric, remaining_balance numeric,
  active_pledge_count bigint, pledged_count bigint, partial_count bigint,
  completed_count bigint, cancelled_count bigint, completion_percentage numeric,
  total_contributors bigint, budget_amount numeric, contribution_deadline date,
  budget_progress_percentage numeric, remaining_to_budget numeric,
  days_remaining integer, deadline_status text
)
language plpgsql security definer set search_path=public,auth,pg_catalog as $$
begin
  if not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  return query
  with totals as (
    select
      coalesce(sum(s.pledged_amount) filter(where s.calculated_status<>'cancelled'),0) pledged,
      coalesce(sum(s.total_paid) filter(where s.calculated_status<>'cancelled'),0) collected,
      coalesce(sum(s.balance) filter(where s.calculated_status<>'cancelled'),0) balance,
      count(*) filter(where s.calculated_status<>'cancelled') active_count,
      count(*) filter(where s.calculated_status='pledged') pending_count,
      count(*) filter(where s.calculated_status='partial') partial_count,
      count(*) filter(where s.calculated_status='completed') completed_count,
      count(*) filter(where s.calculated_status='cancelled') cancelled_count
    from public.event_pledge_financial_summary s where s.event_id=target_event_id
  )
  select t.pledged,t.collected,t.balance,t.active_count,t.pending_count,t.partial_count,
    t.completed_count,t.cancelled_count,
    case when t.pledged=0 then 0 else round(100*t.collected/t.pledged,2) end,
    t.active_count,target.budget_amount,target.contribution_deadline,
    case when target.budget_amount is null then null else round(100*t.collected/target.budget_amount,2) end,
    case when target.budget_amount is null then null else greatest(target.budget_amount-t.collected,0) end,
    case when target.contribution_deadline is null then null else target.contribution_deadline-current_date end,
    case
      when target.budget_amount is not null and t.collected>=target.budget_amount then 'Budget achieved'
      when target.contribution_deadline is null then 'No deadline'
      when target.contribution_deadline<current_date then 'Deadline passed'
      when target.contribution_deadline=current_date then 'Due today'
      else 'Upcoming'
    end
  from totals t left join public.event_finance_targets target on target.event_id=target_event_id;
end;
$$;
revoke all on function public.get_event_finance_summary(bigint) from public;
grant execute on function public.get_event_finance_summary(bigint) to authenticated;

create or replace function public.get_organiser_finance_portal(supplied_token_hash text)
returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare link public.event_finance_access_links%rowtype; result jsonb; collected numeric;
begin
  if not public.is_valid_organiser_token_hash(supplied_token_hash) then return jsonb_build_object('access_status','invalid'); end if;
  select * into link from public.event_finance_access_links where token_hash=supplied_token_hash;
  if not found then return jsonb_build_object('access_status','invalid'); end if;
  if link.revoked_at is not null then return jsonb_build_object('access_status','revoked'); end if;
  if link.expires_at is not null and link.expires_at<=clock_timestamp() then return jsonb_build_object('access_status','expired'); end if;
  if not public.finance_link_is_valid(link,'view_pledges') then return jsonb_build_object('access_status','insufficient_permission'); end if;
  update public.event_finance_access_links set last_used_at=now() where id=link.id;
  select coalesce(sum(s.total_paid) filter(where s.calculated_status<>'cancelled'),0) into collected
  from public.event_pledge_financial_summary s where s.event_id=link.event_id;
  select jsonb_build_object(
    'access_status','active',
    'event',(select jsonb_build_object('id',e.id,'title',e.title,'event_date',e.event_date,'language',e.language) from public.events e where e.id=link.event_id),
    'permissions',link.permissions,
    'summary',(select jsonb_build_object(
      'total_pledged',coalesce(sum(s.pledged_amount) filter(where s.calculated_status<>'cancelled'),0),
      'total_collected',collected,
      'remaining_balance',coalesce(sum(s.balance) filter(where s.calculated_status<>'cancelled'),0),
      'active_pledge_count',count(*) filter(where s.calculated_status<>'cancelled'),
      'total_contributors',count(*) filter(where s.calculated_status<>'cancelled'),
      'pledged_count',count(*) filter(where s.calculated_status='pledged'),
      'partial_count',count(*) filter(where s.calculated_status='partial'),
      'completed_count',count(*) filter(where s.calculated_status='completed'),
      'cancelled_count',count(*) filter(where s.calculated_status='cancelled'),
      'completion_percentage',case when coalesce(sum(s.pledged_amount) filter(where s.calculated_status<>'cancelled'),0)=0 then 0 else round(100*collected/sum(s.pledged_amount) filter(where s.calculated_status<>'cancelled'),2) end
    ) from public.event_pledge_financial_summary s where s.event_id=link.event_id),
    'finance_target',(select jsonb_build_object(
      'budget_amount',t.budget_amount,'contribution_deadline',t.contribution_deadline,
      'budget_progress_percentage',case when t.budget_amount is null then null else round(100*collected/t.budget_amount,2) end,
      'remaining_to_budget',case when t.budget_amount is null then null else greatest(t.budget_amount-collected,0) end,
      'days_remaining',case when t.contribution_deadline is null then null else t.contribution_deadline-current_date end,
      'deadline_status',case when t.budget_amount is not null and collected>=t.budget_amount then 'Budget achieved' when t.contribution_deadline is null then 'No deadline' when t.contribution_deadline<current_date then 'Deadline passed' when t.contribution_deadline=current_date then 'Due today' else 'Upcoming' end
    ) from public.event_finance_targets t where t.event_id=link.event_id),
    'pledges',(select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc),'[]'::jsonb) from public.event_pledge_financial_summary s where s.event_id=link.event_id)
  ) into result;
  return result;
end;
$$;
