-- Atomically claim one committed workflow event for immediate post-save processing.
-- Forward-only. Deliberately not applied automatically.

create or replace function public.claim_workflow_event(target_id bigint)
returns setof public.workflow_events
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
begin
  return query
  update public.workflow_events workflow
  set status='processing',attempt_count=workflow.attempt_count+1,last_error=null
  where workflow.id in (
    select candidate.id
    from public.workflow_events candidate
    where candidate.id=target_id
      and candidate.status in ('pending','failed')
      and candidate.available_at<=now()
      and candidate.attempt_count<5
    for update skip locked
  )
  returning workflow.*;
end
$$;

revoke all on function public.claim_workflow_event(bigint) from public,anon,authenticated;
grant execute on function public.claim_workflow_event(bigint) to service_role;
