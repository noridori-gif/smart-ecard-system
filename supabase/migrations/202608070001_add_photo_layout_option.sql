-- Apply through the normal reviewed migration workflow. Do not run ad hoc in production.
--
-- Adds a photo_layout choice to events, independent of invitation_template:
-- organizers can pick how the cover photo (or lack of one) is presented.
alter table public.events
  add column if not exists photo_layout text not null default 'top_banner';

alter table public.events
  drop constraint if exists events_photo_layout_check;

alter table public.events
  add constraint events_photo_layout_check
  check (
    photo_layout in (
      'top_banner',
      'side_by_side',
      'text_only'
    )
  );

-- Expose photo_layout through the public invitation lookup used by the
-- invite page, WhatsApp card renderer, and template preview.
-- CREATE OR REPLACE can't change a function's OUT-parameter (return table)
-- shape, so the old signature must be dropped first.
drop function if exists public.get_public_invitation(uuid);

create function public.get_public_invitation(token_input uuid)
 returns table(invitation_id bigint, invitation_token uuid, invitation_status text, rsvp_status text, guest_id bigint, guest_name text, allowed_guests integer, category text, qr_token uuid, event_pass_id text, event_id bigint, event_title text, event_type text, bride_name text, groom_name text, language text, ceremony_title text, ceremony_date date, ceremony_time time without time zone, ceremony_venue text, ceremony_map_url text, event_date date, event_time time without time zone, venue text, reception_map_url text, dress_code text, cover_image_url text, theme_primary_color text, theme_secondary_color text, theme_accent_color text, invitation_template text, photo_layout text, invitation_message text)
 language sql
 security definer
 set search_path to 'public'
as $function$
  select
    i.id::bigint as invitation_id,
    i.invitation_token,
    i.invitation_status,
    i.rsvp_status,

    g.id::bigint as guest_id,
    g.full_name as guest_name,
    g.allowed_guests,
    g.category,
    g.qr_token,
    g.event_pass_id,

    e.id::bigint as event_id,
    e.title as event_title,
    e.event_type,
    e.bride_name,
    e.groom_name,
    e.language,

    e.ceremony_title,
    e.ceremony_date,
    e.ceremony_time,
    e.ceremony_venue,
    e.ceremony_map_url,

    e.event_date,
    e.event_time,
    e.venue,
    e.reception_map_url,

    e.dress_code,
    e.cover_image_url,

    e.theme_primary_color,
    e.theme_secondary_color,
    e.theme_accent_color,

    e.invitation_template,
    e.photo_layout,
    e.invitation_message

  from public.invitations as i

  inner join public.guests as g
    on g.id = i.guest_id

  inner join public.events as e
    on e.id = i.event_id

  where i.invitation_token = token_input

  limit 1;
$function$;
