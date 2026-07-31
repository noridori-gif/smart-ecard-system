-- Fix the shared contributor-guest recalculation trigger dispatcher.
-- event_pledges identifies its row with id; pledge_payments identifies its
-- parent contribution with pledge_id. Explicit PL/pgSQL branches prevent
-- PostgreSQL from resolving a field that does not exist on the current NEW row.

create or replace function public.trigger_contributor_guest_recalculation()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  target bigint;
begin
  if tg_table_name = 'pledge_payments' then
    target := new.pledge_id;
  else
    target := new.id;
  end if;

  perform public.sync_contributor_guest(target, tg_table_name);
  return new;
end;
$$;
