-- Correct event_finance_targets privileges for the authenticated upsert flow.
-- This migration is intentionally not applied automatically.

alter table public.event_finance_targets enable row level security;

revoke all privileges on table public.event_finance_targets from anon;
revoke delete on table public.event_finance_targets from authenticated;
grant select, insert, update on table public.event_finance_targets to authenticated;

drop policy if exists event_finance_targets_manage on public.event_finance_targets;
drop policy if exists event_finance_targets_select on public.event_finance_targets;
drop policy if exists event_finance_targets_insert on public.event_finance_targets;
drop policy if exists event_finance_targets_update on public.event_finance_targets;

create policy event_finance_targets_select
on public.event_finance_targets
for select
to authenticated
using (public.can_manage_event_finance(event_id));

create policy event_finance_targets_insert
on public.event_finance_targets
for insert
to authenticated
with check (public.can_manage_event_finance(event_id));

create policy event_finance_targets_update
on public.event_finance_targets
for update
to authenticated
using (public.can_manage_event_finance(event_id))
with check (public.can_manage_event_finance(event_id));
