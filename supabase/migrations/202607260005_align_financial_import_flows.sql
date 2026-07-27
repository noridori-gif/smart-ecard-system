-- Align the already-deployed financial import function with the existing
-- Event Pass generator and transactional payment/receipt flow.

create or replace function public.import_event_financial_rows(
  target_event_id bigint,
  import_rows jsonb,
  include_guests boolean default false,
  create_initial_payments boolean default false,
  skip_duplicates boolean default true,
  source_file_name text default 'Excel Import'
) returns jsonb
language plpgsql security definer
set search_path = public, auth, pg_catalog
as $$
declare
  item jsonb; row_number integer; contributor_name text; contributor_phone text;
  contributor_email text; contributor_category text; pledge_notes text;
  phone_digits text; normalized_value text; pledged numeric; paid numeric;
  duplicate_pledge public.event_pledges%rowtype; matched_guest public.guests%rowtype;
  new_guest_id bigint; new_pledge_id bigint;
  receipt text; pass_id text; payment_result jsonb; imported integer := 0; skipped integer := 0;
  duplicates integer := 0; failed jsonb := '[]'::jsonb; receipts jsonb := '[]'::jsonb;
  receipt_hash text; resolution text; failure_reason text;
begin
  if not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  perform pg_advisory_xact_lock(target_event_id);
  if jsonb_typeof(import_rows) <> 'array' or jsonb_array_length(import_rows) < 1
    or jsonb_array_length(import_rows) > 2000 then raise exception 'Invalid import rows'; end if;

  for item in select value from jsonb_array_elements(import_rows)
  loop
    row_number := coalesce((item->>'rowNumber')::integer, 0);
    contributor_name := btrim(coalesce(item->>'fullName', ''));
    contributor_phone := nullif(btrim(coalesce(item->>'phone', '')), '');
    contributor_email := nullif(lower(btrim(coalesce(item->>'email', ''))), '');
    contributor_category := coalesce(nullif(btrim(item->>'category'), ''), 'Normal');
    pledge_notes := nullif(btrim(coalesce(item->>'notes', '')), '');
    resolution := coalesce(item->>'nameDuplicateAction', '');
    receipt_hash := nullif(item->>'receiptTokenHash', '');
    failure_reason := null;
    begin
      pledged := (item->>'pledgedAmount')::numeric;
      paid := coalesce((item->>'paidAmount')::numeric, 0);
      if contributor_name = '' then raise exception 'Full Name is required'; end if;
      if pledged <= 0 then raise exception 'Pledged Amount must be greater than zero'; end if;
      if paid < 0 or paid > pledged then raise exception 'Paid Amount cannot exceed Pledged Amount'; end if;
      if contributor_email is not null and contributor_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        then raise exception 'Email is invalid'; end if;

      normalized_value := null;
      if contributor_phone is not null then
        phone_digits := regexp_replace(contributor_phone, '[^0-9]', '', 'g');
        if phone_digits like '2550%' then phone_digits := '255' || substr(phone_digits, 5);
        elsif phone_digits like '0%' then phone_digits := '255' || substr(phone_digits, 2);
        elsif phone_digits ~ '^[67][0-9]{8}$' then phone_digits := '255' || phone_digits;
        end if;
        if phone_digits !~ '^255[67][0-9]{8}$' then raise exception 'Phone must be a valid Tanzanian mobile number'; end if;
        normalized_value := phone_digits;
      end if;

      duplicate_pledge := null;
      if normalized_value is not null then
        select * into duplicate_pledge from public.event_pledges
        where event_id = target_event_id and event_pledges.normalized_phone = normalized_value
          and cancelled_at is null limit 1 for update;
      end if;
      if duplicate_pledge.id is not null then
        duplicates := duplicates + 1;
        if skip_duplicates then skipped := skipped + 1; continue; end if;
        raise exception 'A contribution already exists for this event and phone';
      end if;
      if normalized_value is null and (
        exists (select 1 from public.event_pledges p where p.event_id=target_event_id
          and p.cancelled_at is null and lower(regexp_replace(btrim(p.full_name), '\s+', ' ', 'g'))
            = lower(regexp_replace(contributor_name, '\s+', ' ', 'g')))
        or (include_guests and exists (select 1 from public.guests g where g.event_id=target_event_id
          and lower(regexp_replace(btrim(g.full_name), '\s+', ' ', 'g'))
            = lower(regexp_replace(contributor_name, '\s+', ' ', 'g'))))
      ) then
        duplicates := duplicates + 1;
        if resolution = 'skip' then skipped := skipped + 1; continue;
        elsif resolution <> 'create' then raise exception 'Possible name duplicate requires an explicit skip or create choice';
        end if;
      end if;

      new_guest_id := null;
      if include_guests then
        matched_guest := null;
        if normalized_value is not null then
          select * into matched_guest from public.guests g
          where g.event_id=target_event_id and (
            case
              when regexp_replace(coalesce(g.phone,''),'[^0-9]','','g') like '2550%'
                then '255'||substr(regexp_replace(g.phone,'[^0-9]','','g'),5)
              when regexp_replace(coalesce(g.phone,''),'[^0-9]','','g') like '0%'
                then '255'||substr(regexp_replace(g.phone,'[^0-9]','','g'),2)
              when regexp_replace(coalesce(g.phone,''),'[^0-9]','','g') ~ '^[67][0-9]{8}$'
                then '255'||regexp_replace(g.phone,'[^0-9]','','g')
              else regexp_replace(coalesce(g.phone,''),'[^0-9]','','g')
            end
          ) = normalized_value limit 1 for update;
        end if;
        if matched_guest.id is not null then
          new_guest_id := matched_guest.id;
        else
          loop
            select 'SEP-' || string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
              1 + floor(random() * 31)::integer, 1), '')
            into pass_id from generate_series(1, 6);
            exit when not exists(select 1 from public.guests where event_pass_id=pass_id);
          end loop;
          insert into public.guests(event_id,full_name,phone,email,category,allowed_guests,status,event_pass_id,qr_token)
          values(target_event_id,contributor_name,contributor_phone,contributor_email,contributor_category,1,'pending',pass_id,gen_random_uuid()::text)
          returning id into new_guest_id;
          insert into public.invitations(event_id,guest_id) values(target_event_id,new_guest_id);
        end if;
      end if;

      insert into public.event_pledges(event_id,guest_id,full_name,phone,normalized_phone,email,pledged_amount,notes)
      values(target_event_id,new_guest_id,contributor_name,contributor_phone,normalized_value,contributor_email,pledged,pledge_notes)
      returning id into new_pledge_id;

      if create_initial_payments and paid > 0 then
        if receipt_hash is null or not public.is_valid_receipt_token_hash(receipt_hash)
          then raise exception 'Receipt verification token is invalid'; end if;
        payment_result := public.record_pledge_payment_with_verification(
          new_pledge_id, paid, current_date, 'other', null, null,
          'Initial payment imported from Excel', receipt_hash
        );
        receipt := payment_result #>> '{receipt,receipt_number}';
        if receipt is null then raise exception 'Payment receipt was not generated'; end if;
        receipts := receipts || jsonb_build_array(jsonb_build_object('rowNumber',row_number,'receiptNumber',receipt));
      end if;
      imported := imported + 1;
    exception when others then
      get stacked diagnostics failure_reason = message_text;
      failed := failed || jsonb_build_array(jsonb_build_object(
        'rowNumber',row_number,'fullName',contributor_name,'reason',failure_reason
      ));
    end;
  end loop;

  insert into public.finance_audit_logs(event_id,actor_type,actor_user_id,action,metadata)
  values(target_event_id,'authenticated_user',auth.uid(),'pledge_import_completed',
    jsonb_build_object('file_name',left(coalesce(source_file_name,'Excel Import'),255),
      'total_rows',jsonb_array_length(import_rows),'imported_rows',imported,
      'skipped_rows',skipped,'duplicate_rows',duplicates,'failed_rows',jsonb_array_length(failed),
      'include_guests',include_guests,'create_initial_payments',create_initial_payments));
  return jsonb_build_object('importedRows',imported,'skippedRows',skipped,
    'duplicateRows',duplicates,'failedRows',failed,'receipts',receipts);
end;
$$;
