-- Add a structured "received_by" field (the person who physically collected a
-- payment, distinct from "recorded_by" -- the staff account that typed it into
-- the system) and wire the already-existing "provider" column through as a
-- conditional Bank Name / Mobile Network sub-field. Also fixes a pre-existing
-- gap where "cheque" was offered in the Record Payment UI and translations
-- but was never added to the payment_method constraint or any RPC's
-- validation list, so selecting it always failed.
-- Forward-only. Deliberately not applied automatically.

alter table public.pledge_payments add column if not exists received_by text;

alter table public.pledge_payments drop constraint if exists pledge_payments_payment_method_check;
alter table public.pledge_payments add constraint pledge_payments_payment_method_check
  check (payment_method in ('cash','mobile_money','bank','card','cheque','other'));

-- record_pledge_payment_with_verification: gains a received_by_name parameter,
-- so the old 8-arg signature must be dropped before the 9-arg replacement is created.
drop function if exists public.record_pledge_payment_with_verification(bigint,numeric,date,text,text,text,text,text);

create or replace function public.record_pledge_payment_with_verification(
  target_pledge_id bigint,payment_amount numeric,paid_on date,method text,
  reference text,payment_provider text,payment_notes text,supplied_receipt_token_hash text,
  received_by_name text default null
) returns jsonb language plpgsql security definer set search_path=public,auth,pg_catalog as $$
declare pledge public.event_pledges%rowtype; paid numeric; counter_value bigint;
  receipt_number text; payment_id bigint; pledge_summary jsonb;
begin
  if not public.is_valid_receipt_token_hash(supplied_receipt_token_hash) then raise exception 'Invalid receipt token'; end if;
  if payment_amount is null or payment_amount<=0 or method not in ('cash','mobile_money','bank','card','cheque','other')
  then raise exception 'Invalid payment'; end if;
  select * into pledge from public.event_pledges where id=target_pledge_id for update;
  if not found or not public.can_manage_event_finance(pledge.event_id) then raise exception 'Not authorized'; end if;
  if pledge.cancelled_at is not null then raise exception 'Cancelled pledges cannot receive payments'; end if;
  select coalesce(sum(amount),0) into paid from public.pledge_payments
  where pledge_id=pledge.id and voided_at is null;
  if paid+payment_amount>pledge.pledged_amount then raise exception 'Payment exceeds the remaining pledge balance'; end if;
  insert into public.finance_receipt_counters(receipt_year,last_value)
  values(extract(year from coalesce(paid_on,current_date))::int,1)
  on conflict(receipt_year) do update
    set last_value=public.finance_receipt_counters.last_value+1,updated_at=now()
  returning last_value into counter_value;
  receipt_number:='SEP-PAY-'||extract(year from coalesce(paid_on,current_date))::int||'-'||lpad(counter_value::text,6,'0');
  insert into public.pledge_payments(pledge_id,receipt_number,amount,currency_code,payment_date,
    payment_method,payment_reference,provider,notes,recorded_by,received_by)
  values(pledge.id,receipt_number,payment_amount,pledge.currency_code,coalesce(paid_on,current_date),
    method,nullif(btrim(reference),''),nullif(btrim(payment_provider),''),nullif(btrim(payment_notes),''),auth.uid(),
    nullif(btrim(received_by_name),''))
  returning id into payment_id;
  insert into public.finance_receipt_verifications(payment_id,token_hash,issued_by)
  values(payment_id,supplied_receipt_token_hash,auth.uid());
  insert into public.finance_audit_logs(event_id,pledge_id,payment_id,actor_type,actor_user_id,action,new_data)
  values(pledge.event_id,pledge.id,payment_id,'authenticated_user',auth.uid(),'payment_recorded',
    jsonb_build_object('amount',payment_amount,'receipt_number',receipt_number,'payment_method',method));
  select to_jsonb(summary) into pledge_summary from public.event_pledge_financial_summary summary where summary.id=pledge.id;
  return jsonb_build_object('receipt',public.finance_receipt_json(payment_id),'pledge',pledge_summary);
end;
$$;
revoke all on function public.record_pledge_payment_with_verification(bigint,numeric,date,text,text,text,text,text,text) from public;
grant execute on function public.record_pledge_payment_with_verification(bigint,numeric,date,text,text,text,text,text,text) to authenticated;

-- organiser_record_payment: same treatment for the committee/organiser portal path.
drop function if exists public.organiser_record_payment(text,bigint,numeric,date,text,text,text,text);

create or replace function public.organiser_record_payment(
  supplied_token_hash text,target_pledge_id bigint,payment_amount numeric,paid_on date,
  method text,reference text default null,payment_provider text default null,payment_notes text default null,
  received_by_name text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare link public.event_finance_access_links%rowtype; p public.event_pledges%rowtype; paid numeric;
 counter_value bigint; receipt text; payment_id bigint;
begin
  if not public.is_valid_organiser_token_hash(supplied_token_hash) then raise exception 'Invalid access link'; end if;
  select * into link from public.event_finance_access_links where token_hash=supplied_token_hash for update;
  if not found or not public.finance_link_is_valid(link,'record_payments') then raise exception 'Access denied'; end if;
  select * into p from public.event_pledges where id=target_pledge_id and event_id=link.event_id for update;
  if not found then raise exception 'Pledge not found'; end if;
  if p.cancelled_at is not null or payment_amount is null or payment_amount<=0 then raise exception 'Access denied'; end if;
  if method not in ('cash','mobile_money','bank','card','cheque','other') then raise exception 'Access denied'; end if;
  select coalesce(sum(amount),0) into paid from public.pledge_payments where pledge_id=p.id and voided_at is null;
  if paid+payment_amount>p.pledged_amount then raise exception 'Access denied'; end if;
  if not public.finance_link_is_valid(link,'record_payments') then raise exception 'Access denied'; end if;
  insert into public.finance_receipt_counters(receipt_year,last_value)
  values(extract(year from coalesce(paid_on,current_date))::int,1)
  on conflict(receipt_year) do update set last_value=public.finance_receipt_counters.last_value+1,updated_at=now()
  returning last_value into counter_value;
  receipt := 'SEP-PAY-'||extract(year from coalesce(paid_on,current_date))::int||'-'||lpad(counter_value::text,6,'0');
  insert into public.pledge_payments(pledge_id,receipt_number,amount,currency_code,payment_date,payment_method,
    payment_reference,provider,notes,recorded_by,received_by)
  values(p.id,receipt,payment_amount,p.currency_code,coalesce(paid_on,current_date),method,
    nullif(btrim(reference),''),nullif(btrim(payment_provider),''),nullif(btrim(payment_notes),''),null,
    nullif(btrim(received_by_name),''))
  returning id into payment_id;
  insert into public.finance_audit_logs(event_id,pledge_id,payment_id,actor_type,organiser_access_link_id,action,new_data)
  values(link.event_id,p.id,payment_id,'organiser_link',link.id,'payment_recorded',
    jsonb_build_object('amount',payment_amount,'receipt_number',receipt,'payment_method',method));
  update public.event_finance_access_links set last_used_at=now() where id=link.id;
  return jsonb_build_object('receipt_number',receipt,'pledge',
    (select to_jsonb(s) from public.event_pledge_financial_summary s where s.id=p.id));
exception
  when others then
    if sqlerrm in ('Invalid access link','Access denied','Pledge not found') then raise exception '%', sqlerrm; end if;
    raise exception 'Access denied';
end;
$$;
revoke all on function public.organiser_record_payment(text,bigint,numeric,date,text,text,text,text,text) from public;
grant execute on function public.organiser_record_payment(text,bigint,numeric,date,text,text,text,text,text) to anon;

-- correct_pledge_payment: gains a corrected_received_by parameter.
drop function if exists public.correct_pledge_payment(bigint,numeric,date,text,text,text,text,text);

create or replace function public.correct_pledge_payment(
  target_payment_id bigint,
  corrected_amount numeric,
  corrected_payment_date date,
  corrected_method text,
  corrected_reference text,
  corrected_provider text,
  corrected_notes text,
  correction_reason text,
  corrected_received_by text default null
) returns public.event_pledge_financial_summary
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  payment public.pledge_payments%rowtype;
  pledge public.event_pledges%rowtype;
  other_valid_payments numeric;
  corrected_timestamp timestamptz := statement_timestamp();
  result public.event_pledge_financial_summary%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;
  if corrected_amount is null or corrected_amount <= 0 then
    raise exception 'Corrected payment amount must be greater than zero';
  end if;
  if corrected_payment_date is null then
    raise exception 'A corrected payment date is required';
  end if;
  if corrected_method is null
    or corrected_method not in ('cash','mobile_money','bank','card','cheque','other') then
    raise exception 'Unsupported payment method';
  end if;
  if length(btrim(coalesce(correction_reason, ''))) < 3 then
    raise exception 'A clear correction reason is required';
  end if;

  select pay.*
    into payment
  from public.pledge_payments pay
  where pay.id = target_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  select p.*
    into pledge
  from public.event_pledges p
  where p.id = payment.pledge_id
  for update;

  if not found or not public.can_manage_event_finance(pledge.event_id) then
    raise exception 'Not authorized';
  end if;
  if payment.voided_at is not null then
    raise exception 'Voided payments cannot be corrected';
  end if;

  select coalesce(sum(pay.amount), 0)
    into other_valid_payments
  from public.pledge_payments pay
  where pay.pledge_id = pledge.id
    and pay.id <> payment.id
    and pay.voided_at is null;

  if other_valid_payments + corrected_amount > pledge.pledged_amount then
    raise exception 'Corrected payment exceeds the remaining pledge capacity';
  end if;

  update public.pledge_payments
  set amount = corrected_amount,
      payment_date = corrected_payment_date,
      payment_method = corrected_method,
      payment_reference = nullif(btrim(corrected_reference), ''),
      provider = nullif(btrim(corrected_provider), ''),
      notes = nullif(btrim(corrected_notes), ''),
      received_by = nullif(btrim(corrected_received_by), '')
  where id = payment.id;

  insert into public.finance_audit_logs(
    event_id, pledge_id, payment_id, actor_type, actor_user_id, action,
    previous_data, new_data, metadata, created_at
  )
  values (
    pledge.event_id, pledge.id, payment.id, 'authenticated_user', auth.uid(),
    'payment_corrected',
    jsonb_build_object(
      'amount', payment.amount,
      'payment_date', payment.payment_date,
      'payment_method', payment.payment_method,
      'payment_reference', payment.payment_reference,
      'provider', payment.provider,
      'notes', payment.notes,
      'received_by', payment.received_by
    ),
    jsonb_build_object(
      'amount', corrected_amount,
      'payment_date', corrected_payment_date,
      'payment_method', corrected_method,
      'payment_reference', nullif(btrim(corrected_reference), ''),
      'provider', nullif(btrim(corrected_provider), ''),
      'notes', nullif(btrim(corrected_notes), ''),
      'received_by', nullif(btrim(corrected_received_by), '')
    ),
    jsonb_build_object(
      'correction_reason', btrim(correction_reason),
      'corrected_at', corrected_timestamp
    ),
    corrected_timestamp
  );

  select summary.*
    into result
  from public.event_pledge_financial_summary summary
  where summary.id = pledge.id;

  return result;
end;
$$;

revoke all on function public.correct_pledge_payment(bigint,numeric,date,text,text,text,text,text,text) from public;
revoke all on function public.correct_pledge_payment(bigint,numeric,date,text,text,text,text,text,text) from anon;
grant execute on function public.correct_pledge_payment(bigint,numeric,date,text,text,text,text,text,text) to authenticated;

-- finance_receipt_json: expose provider and received_by on staff-facing receipts
-- (PDF + dialog). The public /r/[token] verification page uses a separate,
-- deliberately minimal function (verify_finance_receipt) and is untouched.
create or replace function public.finance_receipt_json(target_payment_id bigint)
returns jsonb language sql stable security definer set search_path=public,auth,pg_catalog as $$
  select jsonb_build_object(
    'receipt_number',pay.receipt_number,
    'event_name',event.title,
    'contributor_name',pledge.full_name,
    'contributor_phone',pledge.phone,
    'pledged_amount',pledge.pledged_amount,
    'payment_amount',pay.amount,
    'total_paid',coalesce((
      select sum(p2.amount) from public.pledge_payments p2
      where p2.pledge_id=pledge.id and p2.voided_at is null
    ),0),
    'remaining_balance',greatest(pledge.pledged_amount-coalesce((
      select sum(p3.amount) from public.pledge_payments p3
      where p3.pledge_id=pledge.id and p3.voided_at is null
    ),0),0),
    'payment_date',pay.payment_date,
    'payment_method',pay.payment_method,
    'payment_reference',pay.payment_reference,
    'provider',pay.provider,
    'received_by',pay.received_by,
    'recorded_by',coalesce(profile.full_name,case when pay.recorded_by is null then 'Committee organiser' else 'Smart Event Pass user' end),
    'payment_status',case when pay.voided_at is null then 'valid' else 'voided' end
  )
  from public.pledge_payments pay
  join public.event_pledges pledge on pledge.id=pay.pledge_id
  join public.events event on event.id=pledge.event_id
  left join public.profiles profile on profile.id=pay.recorded_by
  where pay.id=target_payment_id;
$$;
revoke all on function public.finance_receipt_json(bigint) from public;

-- organiser_payment_history: builds its own jsonb per row (not select *), so it
-- needs received_by added explicitly for the committee portal's payment history view.
create or replace function public.organiser_payment_history(supplied_token_hash text,target_pledge_id bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare link public.event_finance_access_links%rowtype;
begin
  if not public.is_valid_organiser_token_hash(supplied_token_hash) then raise exception 'Invalid access link'; end if;
  select * into link from public.event_finance_access_links where token_hash=supplied_token_hash;
  if not found or not public.finance_link_is_valid(link,'view_payment_history') then raise exception 'Access denied'; end if;
  if not exists(select 1 from public.event_pledges where id=target_pledge_id and event_id=link.event_id) then raise exception 'Pledge not found'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id',p.id,
      'receipt_number',p.receipt_number,
      'amount',p.amount,
      'currency_code',p.currency_code,
      'payment_date',p.payment_date,
      'payment_method',p.payment_method,
      'payment_reference',p.payment_reference,
      'provider',p.provider,
      'received_by',p.received_by,
      'notes',p.notes,
      'created_at',p.created_at,
      'voided_at',p.voided_at,
      'void_reason',p.void_reason
    ) order by p.created_at desc),'[]'::jsonb)
    from public.pledge_payments p where p.pledge_id=target_pledge_id);
exception
  when others then
    if sqlerrm in ('Invalid access link','Access denied','Pledge not found') then raise exception '%', sqlerrm; end if;
    raise exception 'Access denied';
end;
$$;
revoke all on function public.organiser_payment_history(text,bigint) from public;
