-- Scanners (door staff) could not use the check-in page: the events SELECT policy (created in the
-- dashboard, before this migrations folder) only lets admins see all events and organizers see their
-- own, so a scanner's getEvents() returned nothing and no event could be selected. Scanners could
-- already read every guest, but not the rows the page's stats are built from.
--
-- Grants scanners read-only access to everything the check-in page loads, for active (non-archived)
-- events only:
--   events                            event picker
--   invitations                       "Invitations" stat
--   event_pledges, pledge_payments    Single/Double classification, via the security_invoker view
--                                     event_pledge_financial_summary (total_paid comes from payments)
--   event_contributor_guest_settings  classification thresholds/basis
--
-- Only SELECT policies are added. Policies are OR-ed, so admin/organizer access is unchanged, and
-- every write still goes through the existing admin/organizer policies or security definer RPCs.
-- Per-event scanner assignment (instead of all active events) is a planned follow-up.
--
-- Deliberately not applied automatically.

begin;

-- Security definer so the archived_at lookup is not itself filtered by events RLS (same pattern as
-- can_manage_event_finance).
create or replace function public.can_scan_event(target_event_id bigint)
returns boolean language sql stable security definer
set search_path = public, auth
as $$
  select public.has_active_role(array['scanner'])
    and exists (
      select 1 from public.events e
      where e.id = target_event_id and e.archived_at is null
    );
$$;

revoke all on function public.can_scan_event(bigint) from public;
grant execute on function public.can_scan_event(bigint) to authenticated;

create policy events_scanner_read on public.events for select to authenticated
using (public.can_scan_event(id));

create policy invitations_scanner_read on public.invitations for select to authenticated
using (public.can_scan_event(event_id));

create policy event_pledges_scanner_read on public.event_pledges for select to authenticated
using (public.can_scan_event(event_id));

create policy pledge_payments_scanner_read on public.pledge_payments for select to authenticated
using (exists (
  select 1 from public.event_pledges p
  where p.id = pledge_id and public.can_scan_event(p.event_id)
));

create policy contributor_guest_settings_scanner_read on public.event_contributor_guest_settings for select to authenticated
using (public.can_scan_event(event_id));

commit;
