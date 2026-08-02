begin;

create table public.event_automation_connectors (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  provider text not null default 'make' check (provider = 'make'),
  display_name text not null default 'Make',
  webhook_url_encrypted text not null,
  signing_secret_encrypted text not null,
  webhook_url_masked text not null,
  is_active boolean not null default true,
  allowed_event_types text[] not null default '{}',
  timeout_seconds integer not null default 10 check (timeout_seconds between 3 and 30),
  maximum_attempts integer not null default 5 check (maximum_attempts between 1 and 10),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  constraint event_automation_connectors_allowed_events check (
    allowed_event_types <@ array['pledge.submitted','message.acknowledgement.requested','pledge.reminder.send_requested','payment.completed','invitation.sent','rsvp.accepted','guest.checked_in']::text[]
  )
);

create table public.automation_connector_deliveries (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  workflow_event_id bigint references public.workflow_events(id) on delete set null,
  connector_id bigint not null references public.event_automation_connectors(id) on delete cascade,
  delivery_id uuid not null default gen_random_uuid() unique,
  idempotency_key text not null unique,
  event_type text not null,
  status text not null default 'pending' check (status in ('pending','sending','accepted','processing','completed','failed','skipped','cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  request_summary jsonb not null default '{}'::jsonb,
  response_status integer,
  external_execution_id text,
  last_error text,
  sent_at timestamptz,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index automation_connector_deliveries_pending_idx on public.automation_connector_deliveries(status,next_attempt_at) where status in ('pending','failed');
create index automation_connector_deliveries_event_idx on public.automation_connector_deliveries(event_id,created_at desc);
create unique index automation_connector_deliveries_workflow_connector_idx on public.automation_connector_deliveries(workflow_event_id,connector_id) where workflow_event_id is not null;

alter table public.event_automation_connectors enable row level security;
alter table public.automation_connector_deliveries enable row level security;
create policy automation_connector_deliveries_manager_read on public.automation_connector_deliveries for select to authenticated using (public.can_manage_event_finance(event_id));

revoke all on public.event_automation_connectors from anon, authenticated;
revoke all on public.automation_connector_deliveries from anon, authenticated;
grant select on public.automation_connector_deliveries to authenticated;
grant all on public.event_automation_connectors, public.automation_connector_deliveries to service_role;
grant usage, select on sequence public.event_automation_connectors_id_seq, public.automation_connector_deliveries_id_seq to service_role;

commit;
