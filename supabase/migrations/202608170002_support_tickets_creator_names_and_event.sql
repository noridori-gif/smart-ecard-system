-- Support Tickets follow-up: optional "related event" categorization
-- field, plus security-definer read helpers that resolve organizer/sender
-- display names and event titles.
--
-- The profiles/events SELECT RLS policies predate the tracked migrations
-- folder and their exact shape is unverified from here, so rather than
-- assume cross-user profile/event visibility, each read helper below
-- re-implements the same owner-or-admin authorization already enforced by
-- support_tickets/support_ticket_messages RLS (via can_manage_support_ticket)
-- and resolves names as security definer, independent of those policies.
--
-- Forward-only. Deliberately not applied automatically.

alter table public.support_tickets
  add column event_id bigint references public.events(id) on delete set null;

create index support_tickets_event_id_idx
  on public.support_tickets(event_id)
  where event_id is not null;

grant insert(event_id) on public.support_tickets to authenticated;

create or replace function public.list_support_tickets()
returns table (
  id bigint,
  organizer_id uuid,
  organizer_name text,
  subject text,
  status text,
  event_id bigint,
  event_title text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql stable security definer
set search_path = public, auth, pg_catalog
as $$
  select
    t.id, t.organizer_id, coalesce(p.full_name, 'Organizer'), t.subject, t.status,
    t.event_id, e.title, t.created_at, t.updated_at
  from public.support_tickets t
  left join public.profiles p on p.id = t.organizer_id
  left join public.events e on e.id = t.event_id
  where t.organizer_id = auth.uid() or public.is_active_admin()
  order by t.updated_at desc;
$$;
revoke all on function public.list_support_tickets() from public;
grant execute on function public.list_support_tickets() to authenticated;

create or replace function public.get_support_ticket(target_ticket_id bigint)
returns table (
  id bigint,
  organizer_id uuid,
  organizer_name text,
  subject text,
  status text,
  event_id bigint,
  event_title text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql stable security definer
set search_path = public, auth, pg_catalog
as $$
  select
    t.id, t.organizer_id, coalesce(p.full_name, 'Organizer'), t.subject, t.status,
    t.event_id, e.title, t.created_at, t.updated_at
  from public.support_tickets t
  left join public.profiles p on p.id = t.organizer_id
  left join public.events e on e.id = t.event_id
  where t.id = target_ticket_id
    and (t.organizer_id = auth.uid() or public.is_active_admin());
$$;
revoke all on function public.get_support_ticket(bigint) from public;
grant execute on function public.get_support_ticket(bigint) to authenticated;

create or replace function public.list_support_ticket_messages(target_ticket_id bigint)
returns table (
  id bigint,
  ticket_id bigint,
  sender_id uuid,
  sender_name text,
  sender_type text,
  body text,
  created_at timestamptz
)
language plpgsql stable security definer
set search_path = public, auth, pg_catalog
as $$
begin
  if not public.can_manage_support_ticket(target_ticket_id) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    m.id, m.ticket_id, m.sender_id,
    coalesce(p.full_name, case when m.sender_type = 'admin' then 'Admin' else 'Organizer' end),
    m.sender_type, m.body, m.created_at
  from public.support_ticket_messages m
  left join public.profiles p on p.id = m.sender_id
  where m.ticket_id = target_ticket_id
  order by m.created_at asc;
end;
$$;
revoke all on function public.list_support_ticket_messages(bigint) from public;
grant execute on function public.list_support_ticket_messages(bigint) to authenticated;
