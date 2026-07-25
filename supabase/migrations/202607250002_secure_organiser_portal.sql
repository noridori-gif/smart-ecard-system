-- Secure organiser/committee portal. Do not apply automatically.
-- Anonymous callers receive access only through hash-scoped functions below.

create or replace function public.is_valid_organiser_token_hash(supplied_token_hash text)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select supplied_token_hash is not null
    and supplied_token_hash ~ '^[a-f0-9]{64}$';
$$;
revoke all on function public.is_valid_organiser_token_hash(text) from public;

create or replace function public.finance_link_is_valid(link public.event_finance_access_links, required_permission text)
returns boolean language sql volatile set search_path = public, pg_catalog as $$
  select link.revoked_at is null
    and (link.expires_at is null or link.expires_at > clock_timestamp())
    and jsonb_typeof(link.permissions -> required_permission) = 'boolean'
    and (link.permissions -> required_permission) = 'true'::jsonb;
$$;
revoke all on function public.finance_link_is_valid(public.event_finance_access_links,text) from public;

create or replace function public.create_finance_access_link(
  target_event_id bigint, supplied_token_hash text, link_label text,
  link_permissions jsonb, link_expires_at timestamptz default null
) returns public.event_finance_access_links
language plpgsql security definer set search_path = public, auth as $$
declare
  result public.event_finance_access_links%rowtype;
  allowed_permission_keys constant text[] := array[
    'view_pledges','create_pledges','edit_contributors','record_payments',
    'view_payment_history','send_reminders','search'
  ];
begin
  if not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  if not public.is_valid_organiser_token_hash(supplied_token_hash) then raise exception 'Invalid token hash'; end if;
  if jsonb_typeof(link_permissions) <> 'object' then raise exception 'Invalid permissions'; end if;
  if exists (
    select 1 from jsonb_object_keys(link_permissions) supplied(key)
    where not (supplied.key = any(allowed_permission_keys))
  ) then raise exception 'Unknown permission'; end if;
  if exists (
    select 1 from jsonb_each(link_permissions) supplied(key,value)
    where jsonb_typeof(supplied.value) <> 'boolean'
  ) then raise exception 'Permission values must be booleans'; end if;
  if exists (
    select 1 from jsonb_each(link_permissions) supplied(key,value)
    where supplied.key <> 'view_pledges' and supplied.value = 'true'::jsonb
  ) and coalesce((link_permissions->>'view_pledges')::boolean,false) is not true
  then raise exception 'view_pledges is required'; end if;
  if link_expires_at is not null and link_expires_at <= clock_timestamp()
  then raise exception 'Expiry must be in the future'; end if;
  insert into public.event_finance_access_links(event_id,token_hash,label,permissions,expires_at)
  values(target_event_id,supplied_token_hash,nullif(btrim(link_label),''),link_permissions,link_expires_at)
  returning * into result;
  insert into public.finance_audit_logs(event_id,actor_type,actor_user_id,organiser_access_link_id,action,new_data)
  values(target_event_id,'authenticated_user',auth.uid(),result.id,'organiser_link_created',
    jsonb_build_object('label',result.label,'permissions',result.permissions,'expires_at',result.expires_at));
  return result;
end;
$$;

create or replace function public.revoke_finance_access_link(target_link_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare link public.event_finance_access_links%rowtype;
begin
  select * into link from public.event_finance_access_links where id=target_link_id for update;
  if not found or not public.can_manage_event_finance(link.event_id) then raise exception 'Not authorized'; end if;
  if link.revoked_at is null then
    update public.event_finance_access_links set revoked_at=now() where id=link.id;
    insert into public.finance_audit_logs(event_id,actor_type,actor_user_id,organiser_access_link_id,action,new_data)
    values(link.event_id,'authenticated_user',auth.uid(),link.id,'organiser_link_revoked',
      jsonb_build_object('label',link.label,'revoked_at',now()));
  end if;
end;
$$;

create or replace function public.get_organiser_finance_portal(supplied_token_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare link public.event_finance_access_links%rowtype; result jsonb;
begin
  if not public.is_valid_organiser_token_hash(supplied_token_hash) then
    return jsonb_build_object('access_status','invalid');
  end if;
  select * into link from public.event_finance_access_links where token_hash=supplied_token_hash;
  if not found then return jsonb_build_object('access_status','invalid'); end if;
  if link.revoked_at is not null then return jsonb_build_object('access_status','revoked'); end if;
  if link.expires_at is not null and link.expires_at <= clock_timestamp() then return jsonb_build_object('access_status','expired'); end if;
  if not public.finance_link_is_valid(link,'view_pledges') then
    return jsonb_build_object('access_status','insufficient_permission');
  end if;
  update public.event_finance_access_links set last_used_at=now() where id=link.id;
  select jsonb_build_object(
    'access_status','active',
    'event',(select jsonb_build_object('id',e.id,'title',e.title,'event_date',e.event_date,'language',e.language)
      from public.events e where e.id=link.event_id),
    'permissions',link.permissions,
    'summary',(select jsonb_build_object(
      'total_pledged',coalesce(sum(s.pledged_amount) filter(where s.calculated_status<>'cancelled'),0),
      'total_collected',coalesce(sum(s.total_paid) filter(where s.calculated_status<>'cancelled'),0),
      'remaining_balance',coalesce(sum(s.balance) filter(where s.calculated_status<>'cancelled'),0),
      'completion_percentage',case when coalesce(sum(s.pledged_amount) filter(where s.calculated_status<>'cancelled'),0)=0 then 0
       else round(100*sum(s.total_paid) filter(where s.calculated_status<>'cancelled')/
       sum(s.pledged_amount) filter(where s.calculated_status<>'cancelled'),2) end)
      from public.event_pledge_financial_summary s where s.event_id=link.event_id),
    'pledges',(select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc),'[]'::jsonb)
      from public.event_pledge_financial_summary s where s.event_id=link.event_id)
  ) into result;
  return result;
end;
$$;

create or replace function public.organiser_create_pledge(
  supplied_token_hash text, contributor_name text, contributor_phone text,
  contributor_normalized_phone text, contributor_email text, amount numeric, pledge_notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare link public.event_finance_access_links%rowtype; new_pledge_id bigint;
begin
  if not public.is_valid_organiser_token_hash(supplied_token_hash) then raise exception 'Invalid access link'; end if;
  select * into link from public.event_finance_access_links where token_hash=supplied_token_hash for update;
  if not found or not public.finance_link_is_valid(link,'create_pledges') then raise exception 'Access denied'; end if;
  if length(btrim(coalesce(contributor_name,'')))=0
    or length(btrim(coalesce(contributor_phone,'')))=0
    or coalesce(contributor_normalized_phone,'') !~ '^255[0-9]{9}$'
    or amount is null or amount<=0 then raise exception 'Access denied'; end if;
  if not public.finance_link_is_valid(link,'create_pledges') then raise exception 'Access denied'; end if;
  insert into public.event_pledges(event_id,full_name,phone,normalized_phone,email,pledged_amount,notes,created_by)
  values(link.event_id,btrim(contributor_name),btrim(contributor_phone),contributor_normalized_phone,
    nullif(btrim(contributor_email),''),amount,nullif(btrim(pledge_notes),''),null) returning id into new_pledge_id;
  -- Replace the authenticated audit emitted by the general trigger.
  delete from public.finance_audit_logs where pledge_id=new_pledge_id and action='pledge_created'
    and actor_type='authenticated_user' and actor_user_id is null;
  insert into public.finance_audit_logs(event_id,pledge_id,actor_type,organiser_access_link_id,action,new_data)
  values(link.event_id,new_pledge_id,'organiser_link',link.id,'pledge_created',
    jsonb_build_object('full_name',btrim(contributor_name),'phone',btrim(contributor_phone),'pledged_amount',amount));
  update public.event_finance_access_links set last_used_at=now() where id=link.id;
  return (select to_jsonb(s) from public.event_pledge_financial_summary s where s.id=new_pledge_id);
exception
  when others then
    if sqlerrm in ('Invalid access link','Access denied') then raise exception '%', sqlerrm; end if;
    raise exception 'Access denied';
end;
$$;

create or replace function public.organiser_update_pledge(
  supplied_token_hash text, target_pledge_id bigint, contributor_name text,
  contributor_phone text, contributor_normalized_phone text, contributor_email text, pledge_notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare link public.event_finance_access_links%rowtype; old_data public.event_pledges%rowtype;
begin
  if not public.is_valid_organiser_token_hash(supplied_token_hash) then raise exception 'Invalid access link'; end if;
  select * into link from public.event_finance_access_links where token_hash=supplied_token_hash for update;
  if not found or not public.finance_link_is_valid(link,'edit_contributors') then raise exception 'Access denied'; end if;
  select * into old_data from public.event_pledges where id=target_pledge_id and event_id=link.event_id for update;
  if not found then raise exception 'Pledge not found'; end if;
  if length(btrim(coalesce(contributor_name,'')))=0
    or length(btrim(coalesce(contributor_phone,'')))=0
    or coalesce(contributor_normalized_phone,'') !~ '^255[0-9]{9}$'
  then raise exception 'Access denied'; end if;
  if not public.finance_link_is_valid(link,'edit_contributors') then raise exception 'Access denied'; end if;
  update public.event_pledges set full_name=btrim(contributor_name),phone=btrim(contributor_phone),
    normalized_phone=contributor_normalized_phone,
    email=case when contributor_email is null then null else nullif(btrim(contributor_email),'') end,
    notes=case when pledge_notes is null then null else nullif(btrim(pledge_notes),'') end
    where id=old_data.id and event_id=link.event_id;
  delete from public.finance_audit_logs where pledge_id=old_data.id and action='pledge_updated'
    and actor_type='authenticated_user' and actor_user_id is null and created_at >= transaction_timestamp();
  insert into public.finance_audit_logs(event_id,pledge_id,actor_type,organiser_access_link_id,action,previous_data,new_data)
  values(link.event_id,old_data.id,'organiser_link',link.id,'pledge_updated',
    jsonb_build_object('full_name',old_data.full_name,'phone',old_data.phone,'email',old_data.email,'notes',old_data.notes),
    jsonb_build_object('full_name',btrim(contributor_name),'phone',btrim(contributor_phone),
      'email',case when contributor_email is null then null else nullif(btrim(contributor_email),'') end,
      'notes',case when pledge_notes is null then null else nullif(btrim(pledge_notes),'') end));
  update public.event_finance_access_links set last_used_at=now() where id=link.id;
  return (select to_jsonb(s) from public.event_pledge_financial_summary s where s.id=old_data.id);
exception
  when others then
    if sqlerrm in ('Invalid access link','Access denied','Pledge not found') then raise exception '%', sqlerrm; end if;
    raise exception 'Access denied';
end;
$$;

create or replace function public.organiser_record_payment(
  supplied_token_hash text,target_pledge_id bigint,payment_amount numeric,paid_on date,
  method text,reference text default null,payment_provider text default null,payment_notes text default null
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
  if method not in ('cash','mobile_money','bank','card','other') then raise exception 'Access denied'; end if;
  select coalesce(sum(amount),0) into paid from public.pledge_payments where pledge_id=p.id and voided_at is null;
  if paid+payment_amount>p.pledged_amount then raise exception 'Access denied'; end if;
  if not public.finance_link_is_valid(link,'record_payments') then raise exception 'Access denied'; end if;
  insert into public.finance_receipt_counters(receipt_year,last_value)
  values(extract(year from coalesce(paid_on,current_date))::int,1)
  on conflict(receipt_year) do update set last_value=public.finance_receipt_counters.last_value+1,updated_at=now()
  returning last_value into counter_value;
  receipt := 'SEP-PAY-'||extract(year from coalesce(paid_on,current_date))::int||'-'||lpad(counter_value::text,6,'0');
  insert into public.pledge_payments(pledge_id,receipt_number,amount,currency_code,payment_date,payment_method,
    payment_reference,provider,notes,recorded_by)
  values(p.id,receipt,payment_amount,p.currency_code,coalesce(paid_on,current_date),method,
    nullif(btrim(reference),''),nullif(btrim(payment_provider),''),nullif(btrim(payment_notes),''),null)
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

revoke all on function public.create_finance_access_link(bigint,text,text,jsonb,timestamptz) from public;
revoke all on function public.revoke_finance_access_link(uuid) from public;
grant execute on function public.create_finance_access_link(bigint,text,text,jsonb,timestamptz) to authenticated;
grant execute on function public.revoke_finance_access_link(uuid) to authenticated;

revoke all on function public.get_organiser_finance_portal(text) from public;
revoke all on function public.organiser_create_pledge(text,text,text,text,text,numeric,text) from public;
revoke all on function public.organiser_update_pledge(text,bigint,text,text,text,text,text) from public;
revoke all on function public.organiser_record_payment(text,bigint,numeric,date,text,text,text,text) from public;
revoke all on function public.organiser_payment_history(text,bigint) from public;
grant execute on function public.get_organiser_finance_portal(text) to anon;
grant execute on function public.organiser_create_pledge(text,text,text,text,text,numeric,text) to anon;
grant execute on function public.organiser_update_pledge(text,bigint,text,text,text,text,text) to anon;
grant execute on function public.organiser_record_payment(text,bigint,numeric,date,text,text,text,text) to anon;
grant execute on function public.organiser_payment_history(text,bigint) to anon;
