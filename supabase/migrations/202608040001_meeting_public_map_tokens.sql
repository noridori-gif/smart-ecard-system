-- Opaque public tokens for the Meeting Invitations WhatsApp map button.

alter table public.event_meetings
add column public_map_token text;

update public.event_meetings
set public_map_token = encode(extensions.gen_random_bytes(18), 'hex')
where public_map_token is null;

alter table public.event_meetings
alter column public_map_token set default encode(extensions.gen_random_bytes(18), 'hex'),
alter column public_map_token set not null;

create unique index event_meetings_public_map_token_idx
on public.event_meetings(public_map_token);

alter table public.event_meetings
add constraint event_meetings_public_map_token_format
check (public_map_token ~ '^[a-f0-9]{36}$');
