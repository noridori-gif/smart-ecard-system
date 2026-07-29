create or replace function public.create_finance_access_link(
  target_event_id bigint, supplied_token_hash text, link_label text,
  link_permissions jsonb, link_expires_at timestamptz default null
) returns public.event_finance_access_links
language plpgsql security definer set search_path = public, auth as $$
declare
  result public.event_finance_access_links%rowtype;
  allowed_permission_keys constant text[] := array[
    'view_pledges','create_pledges','edit_contributors','record_payments',
    'view_payment_history','send_reminders','search','send_thank_you','view_reports'
  ];
begin
  if not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  if not public.is_valid_organiser_token_hash(supplied_token_hash) then raise exception 'Invalid token hash'; end if;
  if jsonb_typeof(link_permissions) <> 'object' then raise exception 'Invalid permissions'; end if;
  if exists (select 1 from jsonb_object_keys(link_permissions) supplied(key) where not (supplied.key = any(allowed_permission_keys)))
  then raise exception 'Unknown permission'; end if;
  if exists (select 1 from jsonb_each(link_permissions) supplied(key,value) where jsonb_typeof(supplied.value) <> 'boolean')
  then raise exception 'Permission values must be booleans'; end if;
  if exists (select 1 from jsonb_each(link_permissions) supplied(key,value) where supplied.key <> 'view_pledges' and supplied.value = 'true'::jsonb)
    and coalesce((link_permissions->>'view_pledges')::boolean,false) is not true
  then raise exception 'view_pledges is required'; end if;
  if link_expires_at is not null and link_expires_at <= clock_timestamp() then raise exception 'Expiry must be in the future'; end if;
  insert into public.event_finance_access_links(event_id,token_hash,label,permissions,expires_at)
  values(target_event_id,supplied_token_hash,nullif(btrim(link_label),''),link_permissions,link_expires_at)
  returning * into result;
  insert into public.finance_audit_logs(event_id,actor_type,actor_user_id,organiser_access_link_id,action,new_data)
  values(target_event_id,'authenticated_user',auth.uid(),result.id,'organiser_link_created',
    jsonb_build_object('label',result.label,'permissions',result.permissions,'expires_at',result.expires_at));
  return result;
end;
$$;
