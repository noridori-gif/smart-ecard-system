-- Allow event pledges without phone numbers while retaining validation for
-- every non-null normalized phone. Deliberately not applied automatically.

update public.event_pledges
set phone = null
where phone is not null
  and btrim(phone) = '';

update public.event_pledges
set normalized_phone = null
where normalized_phone is not null
  and btrim(normalized_phone) = '';

alter table public.event_pledges
  drop constraint if exists event_pledges_normalized_phone_check;

alter table public.event_pledges
  add constraint event_pledges_normalized_phone_check
  check (
    normalized_phone is null
    or normalized_phone ~ '^255[0-9]{9}$'
  );

-- Keep the existing organiser RPC contracts while making their phone inputs
-- optional and retaining duplicate protection for real phone numbers.
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
    or (contributor_normalized_phone is not null and contributor_normalized_phone !~ '^255[0-9]{9}$')
    or amount is null or amount<=0 then raise exception 'Access denied'; end if;
  if contributor_normalized_phone is not null and exists(
    select 1 from public.event_pledges p where p.event_id=link.event_id
      and p.normalized_phone=contributor_normalized_phone and p.cancelled_at is null
  ) then raise exception 'A contribution already exists for this event and phone'; end if;
  insert into public.event_pledges(event_id,full_name,phone,normalized_phone,email,pledged_amount,notes,created_by)
  values(link.event_id,btrim(contributor_name),nullif(btrim(contributor_phone),''),contributor_normalized_phone,
    nullif(btrim(contributor_email),''),amount,nullif(btrim(pledge_notes),''),null) returning id into new_pledge_id;
  delete from public.finance_audit_logs where pledge_id=new_pledge_id and action='pledge_created'
    and actor_type='authenticated_user' and actor_user_id is null;
  insert into public.finance_audit_logs(event_id,pledge_id,actor_type,organiser_access_link_id,action,new_data)
  values(link.event_id,new_pledge_id,'organiser_link',link.id,'pledge_created',
    jsonb_build_object('full_name',btrim(contributor_name),'phone',nullif(btrim(contributor_phone),''),'pledged_amount',amount));
  update public.event_finance_access_links set last_used_at=now() where id=link.id;
  return (select to_jsonb(s) from public.event_pledge_financial_summary s where s.id=new_pledge_id);
exception when others then
  if sqlerrm in ('Invalid access link','Access denied','A contribution already exists for this event and phone') then raise exception '%', sqlerrm; end if;
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
    or (contributor_normalized_phone is not null and contributor_normalized_phone !~ '^255[0-9]{9}$')
  then raise exception 'Access denied'; end if;
  if contributor_normalized_phone is not null and exists(
    select 1 from public.event_pledges p where p.event_id=link.event_id and p.id<>old_data.id
      and p.normalized_phone=contributor_normalized_phone and p.cancelled_at is null
  ) then raise exception 'A contribution already exists for this event and phone'; end if;
  update public.event_pledges set full_name=btrim(contributor_name),phone=nullif(btrim(contributor_phone),''),
    normalized_phone=contributor_normalized_phone,
    email=case when contributor_email is null then null else nullif(btrim(contributor_email),'') end,
    notes=case when pledge_notes is null then null else nullif(btrim(pledge_notes),'') end
    where id=old_data.id and event_id=link.event_id;
  delete from public.finance_audit_logs where pledge_id=old_data.id and action='pledge_updated'
    and actor_type='authenticated_user' and actor_user_id is null and created_at >= transaction_timestamp();
  insert into public.finance_audit_logs(event_id,pledge_id,actor_type,organiser_access_link_id,action,previous_data,new_data)
  values(link.event_id,old_data.id,'organiser_link',link.id,'pledge_updated',
    jsonb_build_object('full_name',old_data.full_name,'phone',old_data.phone,'email',old_data.email,'notes',old_data.notes),
    jsonb_build_object('full_name',btrim(contributor_name),'phone',nullif(btrim(contributor_phone),''),
      'email',case when contributor_email is null then null else nullif(btrim(contributor_email),'') end,
      'notes',case when pledge_notes is null then null else nullif(btrim(pledge_notes),'') end));
  update public.event_finance_access_links set last_used_at=now() where id=link.id;
  return (select to_jsonb(s) from public.event_pledge_financial_summary s where s.id=old_data.id);
exception when others then
  if sqlerrm in ('Invalid access link','Access denied','Pledge not found','A contribution already exists for this event and phone') then raise exception '%', sqlerrm; end if;
  raise exception 'Access denied';
end;
$$;
