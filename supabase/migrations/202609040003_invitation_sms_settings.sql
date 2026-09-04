-- Organizer-customizable SMS wording for the guest invitation SMS
-- ("Umealikwa kwenye ..."). Deliberately its own table rather than a column
-- on event_finance_automation_settings: guest invitations apply to every
-- event regardless of whether the financial/pledge suite is enabled for it.
-- Apply through the normal reviewed migration workflow. Do not run ad hoc in production.

create table public.event_invitation_sms_settings (
  event_id bigint primary key references public.events(id) on delete cascade,
  custom_invitation_sms_message text check (char_length(custom_invitation_sms_message) <= 1000),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger event_invitation_sms_settings_updated_at
before update on public.event_invitation_sms_settings
for each row execute function public.set_finance_updated_at();

alter table public.event_invitation_sms_settings enable row level security;

-- can_manage_event_finance() (202607250001) is a general admin-or-owning-organizer
-- check despite its name -- already reused outside finance for invitation layout
-- (202609030001), so reusing it here for invitation SMS settings is consistent.
create policy event_invitation_sms_settings_manage on public.event_invitation_sms_settings
for all to authenticated
using (public.can_manage_event_finance(event_id))
with check (public.can_manage_event_finance(event_id));

revoke all on public.event_invitation_sms_settings from anon, authenticated, service_role;
grant select, insert, update on public.event_invitation_sms_settings to authenticated;
