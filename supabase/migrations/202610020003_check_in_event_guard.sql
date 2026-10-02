-- Reject check-ins for a pass that belongs to a different event than the one selected on the
-- scanner. Previously secure_guest_check_in looked a guest up by qr_token / event_pass_id alone,
-- so a pass from Event A was checked in even while the scanner had Event B selected.
--
-- Adds expected_event_id. When set and the guest belongs to another event, the RPC returns the
-- new status 'wrong_event' without touching the guest row. It defaults to null (old behaviour)
-- only for the rollout window, so the currently deployed frontend keeps working until the new
-- build is live; a follow-up migration will make it required.
--
-- The signature changes, so the old function is dropped and recreated in one transaction --
-- there is never a moment where the RPC does not exist.

begin;

drop function if exists public.secure_guest_check_in(text, text);

create function public.secure_guest_check_in(
  qr_token_input text default null::text,
  event_pass_id_input text default null::text,
  expected_event_id bigint default null::bigint
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  guest_record public.guests%rowtype;
  normalized_qr_token text;
  normalized_qr_uuid uuid;
  normalized_event_pass_id text;
  guest_event_title text;
  new_count integer;
begin
  if not public.has_active_role(
    array['admin','organizer','scanner']
  ) then
    raise exception 'You are not authorized to check in guests.'
      using errcode = '42501';
  end if;

  normalized_qr_token := nullif(trim(qr_token_input), '');
  normalized_event_pass_id := nullif(upper(trim(event_pass_id_input)), '');

  if normalized_qr_token is null and normalized_event_pass_id is null then
    return jsonb_build_object('success', false, 'status', 'invalid',
      'message', 'QR Code or Event Pass ID is required.', 'guest', null);
  end if;

  if normalized_qr_token is not null and normalized_event_pass_id is not null then
    return jsonb_build_object('success', false, 'status', 'invalid',
      'message', 'Use either QR Code or Event Pass ID.', 'guest', null);
  end if;

  if normalized_qr_token is not null then
    begin
      normalized_qr_uuid := normalized_qr_token::uuid;
    exception
      when invalid_text_representation then
        return jsonb_build_object('success', false, 'status', 'invalid',
          'message', 'Invalid QR Code', 'guest', null);
    end;
    select * into guest_record from public.guests
      where qr_token = normalized_qr_uuid for update;
  else
    select * into guest_record from public.guests
      where upper(event_pass_id) = normalized_event_pass_id for update;
  end if;

  if not found then
    return jsonb_build_object('success', false, 'status', 'invalid',
      'message', case when normalized_qr_token is not null
        then 'Invalid QR Code' else 'Invalid Event Pass ID' end,
      'guest', null);
  end if;

  -- Must run before the already-checked-in check and the update: a pass from another event is
  -- rejected outright and its row is never modified.
  if expected_event_id is not null and guest_record.event_id <> expected_event_id then
    select title into guest_event_title from public.events where id = guest_record.event_id;
    return jsonb_build_object('success', false, 'status', 'wrong_event',
      'message', format('Pass hii ni ya event nyingine: %s', coalesce(guest_event_title, 'event isiyojulikana')),
      'guest', to_jsonb(guest_record));
  end if;

  if guest_record.checked_in_count >= guest_record.allowed_guests then
    return jsonb_build_object('success', false, 'status', 'already_checked_in',
      'message', format('All %s guests already checked in', guest_record.allowed_guests),
      'guest', to_jsonb(guest_record));
  end if;

  new_count := guest_record.checked_in_count + 1;

  update public.guests set
    checked_in_count = new_count,
    checked_in_at = coalesce(checked_in_at, now()),
    last_checked_in_at = now(),
    status = case when new_count >= allowed_guests then 'checked_in' else 'partially_checked_in' end
    where id = guest_record.id returning * into guest_record;

  return jsonb_build_object(
    'success', true,
    'status', guest_record.status,
    'message', format('%s of %s guests checked in', new_count, guest_record.allowed_guests),
    'guest', to_jsonb(guest_record)
  );
end;
$function$;

-- A dropped function loses its grants; only signed-in users may call it (the role check inside
-- then restricts it to admin/organizer/scanner).
revoke execute on function public.secure_guest_check_in(text, text, bigint) from public, anon;
grant execute on function public.secure_guest_check_in(text, text, bigint) to authenticated;

-- Refresh PostgREST's schema cache so the new 3-argument signature is callable immediately.
notify pgrst, 'reload schema';

commit;
