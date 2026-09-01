-- Support partial (count-based) check-in for multi-guest passes (e.g. Double = 2 allowed guests).
-- A pass can now be checked in one person at a time without being rejected as "already used"
-- until checked_in_count reaches allowed_guests. checked_in_at stays the first-arrival time;
-- last_checked_in_at tracks the most recent scan.

alter table public.guests
  add column if not exists checked_in_count integer not null default 0,
  add column if not exists last_checked_in_at timestamptz;

alter table public.guests
  add constraint guests_checked_in_count_range
  check (checked_in_count >= 0 and checked_in_count <= allowed_guests);

-- Backfill: passes already fully checked in under the old boolean model count as fully used.
update public.guests
  set checked_in_count = allowed_guests, last_checked_in_at = checked_in_at
  where status = 'checked_in' and checked_in_count = 0;

create or replace function public.secure_guest_check_in(qr_token_input text default null::text, event_pass_id_input text default null::text)
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
