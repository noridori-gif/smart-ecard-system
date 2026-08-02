-- Extend the public-safe pledge-link projection used by server-rendered previews.
-- Forward-only. Deliberately not applied automatically.

create or replace function public.get_public_pledge_link(
  supplied_token_hash text
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce((
    select
      case
        when not link.is_active
          or (
            link.expires_at is not null
            and link.expires_at <= now()
          )
        then jsonb_build_object(
          'valid', false
        )
        else jsonb_build_object(
          'valid', true,
          'event_name', event.title,
          'title', link.title,
          'message', link.message,
          'language', link.default_language,
          'event_date', event.event_date,
          'event_time', event.event_time,
          'venue', event.venue,
          'cover_image_url', event.cover_image_url,
          'invitation_template', event.invitation_template,
          'theme_primary_color', event.theme_primary_color,
          'theme_secondary_color', event.theme_secondary_color,
          'theme_accent_color', event.theme_accent_color,
          'updated_at', link.updated_at
        )
      end
    from public.public_pledge_links link
    join public.events event
      on event.id = link.event_id
    where link.token_hash = supplied_token_hash
    limit 1
  ), jsonb_build_object('valid', false));
$$;

revoke all
on function public.get_public_pledge_link(text)
from public;

grant execute
on function public.get_public_pledge_link(text)
to anon;