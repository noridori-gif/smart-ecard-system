-- Replace the single manual expense_budget_amount total with itemized
-- per-category budgets. Confirmed zero live usage of expense_budget_amount
-- before removing it (only 3 test expenses existed, no budget ever set).
-- Forward-only. Deliberately not applied automatically.

-- 1. Remove the manual total -- it's now auto-calculated client-side as the
-- sum of event_expense_category_budgets.
alter table public.event_finance_targets drop column expense_budget_amount;

-- 2. get_event_finance_summary()'s return type is changing (one fewer column),
-- which requires a drop before recreate, same as any RETURNS TABLE column change.
drop function if exists public.get_event_finance_summary(bigint);
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

-- 3. Itemized per-category expense budgets. Free-text category (matches
-- event_expenses.category, no separate categories table), one budget per
-- category per event. Plain RLS-gated table with direct upsert, like
-- event_finance_targets -- this is a planning figure, not a transaction,
-- so no RPC/audit-log layer.
create table public.event_expense_category_budgets (
  event_id bigint not null references public.events(id) on delete restrict,
  category text not null check (length(btrim(category)) > 0),
  budgeted_amount numeric(18,2) not null check (budgeted_amount > 0),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, category)
);
create trigger event_expense_category_budgets_updated_at
before update on public.event_expense_category_budgets
for each row execute function public.set_finance_updated_at();

alter table public.event_expense_category_budgets enable row level security;
create policy finance_expense_category_budgets_manage on public.event_expense_category_budgets
for all to authenticated
using (public.can_manage_event_finance(event_id))
with check (public.can_manage_event_finance(event_id));
