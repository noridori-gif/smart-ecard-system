-- Apply through the normal reviewed migration workflow. Do not run ad hoc in production.
--
-- Requires 202610010001_gilded_border_template.sql to have been applied first.
--
-- Adds the organizer's colour choice for the gilded_border WhatsApp card:
-- the redesigned card (lib/GildedBorderCard.tsx, built from the client's
-- mwaliko-navy / mwaliko-cream reference renderings) has two colour variants
-- sharing one layout -- "navy" (dark card, cream QR panel) and "cream" (light
-- card, navy QR panel). Only read when invitation_template = 'gilded_border'.
--
-- Not null with a default, like photo_layout: every existing event --
-- including any already on gilded_border -- becomes 'navy', the variant the
-- card renders when nothing was chosen, so no live invitation changes colour.

alter table public.events
  add column if not exists gilded_variant text not null default 'navy'
  check (gilded_variant in ('navy', 'cream'));

-- Expose it through the public invitation lookup used by the WhatsApp card
-- renderer.
-- CREATE OR REPLACE can't change a function's OUT-parameter (return table)
-- shape, so the old signature must be dropped first. Identical to the
-- 202610010001 definition apart from the added gilded_variant column.
drop function if exists public.get_public_invitation(uuid);

create function public.get_public_invitation(token_input uuid)
 returns table(invitation_id bigint, invitation_token uuid, invitation_status text, rsvp_status text, guest_id bigint, guest_name text, allowed_guests integer, category text, qr_token uuid, event_pass_id text, event_id bigint, event_title text, event_type text, bride_name text, groom_name text, language text, ceremony_title text, ceremony_date date, ceremony_time time without time zone, ceremony_venue text, ceremony_map_url text, event_date date, event_time time without time zone, venue text, reception_map_url text, dress_code text, cover_image_url text, theme_primary_color text, theme_secondary_color text, theme_accent_color text, invitation_template text, photo_layout text, invitation_message text, custom_invitation_background_url text, custom_layout_elements jsonb, contact_phone text, gilded_variant text)
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
    e.invitation_message,

    e.custom_invitation_background_url,

    (
      select jsonb_agg(
        jsonb_build_object(
          'key', l.element_key,
          'xPct', l.x_pct,
          'yPct', l.y_pct,
          'widthPct', l.width_pct,
          'heightPct', l.height_pct,
          'fontSize', l.font_size,
          'align', l.align,
          'color', l.color
        )
      )
      from public.event_invitation_layout_elements as l
      where l.event_id = e.id
    ) as custom_layout_elements,

    e.contact_phone,

    e.gilded_variant

  from public.invitations as i

  inner join public.guests as g
    on g.id = i.guest_id

  inner join public.events as e
    on e.id = i.event_id

  where i.invitation_token = token_input

  limit 1;
$function$;
