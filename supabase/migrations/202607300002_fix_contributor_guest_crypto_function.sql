-- Forward-only fix for pgcrypto resolution inside contributor guest synchronization.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.sync_contributor_guest(
  target_pledge_id bigint, sync_source text default 'automatic'
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  pledge public.event_pledges%rowtype; setting public.event_contributor_guest_settings%rowtype;
  linked public.guests%rowtype; candidate public.guests%rowtype;
  basis_amount numeric; desired integer; candidate_count integer := 0;
  normalized text; normalized_name text; old_allowed integer; new_guest boolean := false;
  invitation_protected boolean := false; pass_id text; result_label text;
begin
  select * into pledge from public.event_pledges where id=target_pledge_id for update;
  if pledge.id is null then raise exception 'Contributor not found'; end if;
  if auth.uid() is not null and not public.can_manage_event_finance(pledge.event_id) then raise exception 'Not authorized'; end if;
  select * into setting from public.event_contributor_guest_settings where event_id=pledge.event_id;
  if setting.event_id is null or not setting.contributor_guest_sync_enabled or pledge.cancelled_at is not null then
    return jsonb_build_object('status','disabled');
  end if;

  select case when setting.classification_basis='pledged_amount' then pledge.pledged_amount
    else coalesce(sum(p.amount) filter(where p.voided_at is null),0) end
  into basis_amount from public.pledge_payments p where p.pledge_id=pledge.id;
  desired := case when basis_amount >= setting.double_card_minimum then 2
    when basis_amount >= setting.single_card_minimum then 1 else 0 end;

  if desired=0 then
    update public.event_pledges set guest_eligibility_status=
      case when setting.below_minimum_behavior='pending_guest' then 'pending_guest' else 'below_minimum' end
    where id=pledge.id;
    if pledge.guest_id is not null then
      insert into public.finance_audit_logs(event_id,pledge_id,actor_type,actor_user_id,action,metadata)
      values(pledge.event_id,pledge.id,case when auth.uid() is null then 'system' else 'authenticated_user' end,
        auth.uid(),'contributor_guest_eligibility_lost',
        jsonb_build_object('guest_id',pledge.guest_id,'basis',setting.classification_basis,
          'basis_amount',basis_amount,'single_minimum',setting.single_card_minimum,
          'double_minimum',setting.double_card_minimum,'source',left(sync_source,40)));
    end if;
    return jsonb_build_object('status',setting.below_minimum_behavior,'basisAmount',basis_amount);
  end if;

  if pledge.guest_id is not null then
    select * into linked from public.guests where id=pledge.guest_id and event_id=pledge.event_id for update;
  else
    normalized := public.normalize_tanzanian_mobile(pledge.phone);
    normalized_name := lower(regexp_replace(btrim(pledge.full_name), '\s+', ' ', 'g'));
    if normalized is not null then
      select count(*), min(g.id) into candidate_count, candidate.id from public.guests g
      where g.event_id=pledge.event_id and public.normalize_tanzanian_mobile(g.phone)=normalized;
    else
      select count(*), min(g.id) into candidate_count, candidate.id from public.guests g
      where g.event_id=pledge.event_id
        and lower(regexp_replace(btrim(g.full_name), '\s+', ' ', 'g'))=normalized_name;
    end if;
    if candidate_count > 1 then
      update public.event_pledges set guest_eligibility_status='needs_review' where id=pledge.id;
      insert into public.finance_audit_logs(event_id,pledge_id,actor_type,actor_user_id,action,metadata)
      values(pledge.event_id,pledge.id,case when auth.uid() is null then 'system' else 'authenticated_user' end,
        auth.uid(),'contributor_guest_sync_failed',
        jsonb_build_object('reason','ambiguous_match','candidate_count',candidate_count,'source',left(sync_source,40)));
      return jsonb_build_object('status','needs_review','candidateCount',candidate_count);
    elsif candidate_count=1 then
      select * into linked from public.guests where id=candidate.id for update;
      if exists(select 1 from public.event_pledges p where p.event_id=pledge.event_id and p.guest_id=linked.id
        and p.cancelled_at is null and p.id<>pledge.id) then
        update public.event_pledges set guest_eligibility_status='needs_review' where id=pledge.id;
        return jsonb_build_object('status','needs_review','candidateCount',1);
      end if;
      update public.event_pledges set guest_id=linked.id where id=pledge.id;
      insert into public.finance_audit_logs(event_id,pledge_id,actor_type,actor_user_id,action,metadata)
      values(pledge.event_id,pledge.id,case when auth.uid() is null then 'system' else 'authenticated_user' end,
        auth.uid(),'contributor_guest_linked',jsonb_build_object('guest_id',linked.id,'source',left(sync_source,40)));
    else
      loop
        pass_id := 'SEP-' || upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,6));
        exit when not exists(select 1 from public.guests where event_pass_id=pass_id);
      end loop;
      insert into public.guests(event_id,full_name,phone,email,category,allowed_guests,status,event_pass_id,qr_token)
      values(pledge.event_id,pledge.full_name,pledge.phone,pledge.email,'Normal',desired,'pending',pass_id,extensions.gen_random_uuid()::text)
      returning * into linked;
      insert into public.invitations(event_id,guest_id) values(pledge.event_id,linked.id);
      update public.event_pledges set guest_id=linked.id where id=pledge.id;
      new_guest := true;
      insert into public.finance_audit_logs(event_id,pledge_id,actor_type,actor_user_id,action,metadata)
      values(pledge.event_id,pledge.id,case when auth.uid() is null then 'system' else 'authenticated_user' end,
        auth.uid(),'contributor_guest_created',
        jsonb_build_object('guest_id',linked.id,'allowed_guests',desired,'basis',setting.classification_basis,
          'basis_amount',basis_amount,'source',left(sync_source,40)));
    end if;
  end if;

  old_allowed := linked.allowed_guests;
  if desired > old_allowed and setting.auto_upgrade_guest_card then
    update public.guests set allowed_guests=desired,
      full_name=pledge.full_name,phone=coalesce(nullif(pledge.phone,''),phone),
      email=coalesce(nullif(pledge.email,''),email) where id=linked.id;
    if not new_guest then
      insert into public.finance_audit_logs(event_id,pledge_id,actor_type,actor_user_id,action,metadata)
      values(pledge.event_id,pledge.id,case when auth.uid() is null then 'system' else 'authenticated_user' end,
        auth.uid(),'contributor_guest_card_upgraded',
        jsonb_build_object('guest_id',linked.id,'old_allowed_guests',old_allowed,'new_allowed_guests',desired,
          'basis',setting.classification_basis,'basis_amount',basis_amount,'source',left(sync_source,40)));
    end if;
  elsif desired < old_allowed then
    select linked.checked_in_at is not null or exists(
      select 1 from public.invitations i where i.guest_id=linked.id and (
        coalesce(i.invitation_status,'') not in ('','pending') or coalesce(i.rsvp_status,'') not in ('','pending')
      )) into invitation_protected;
    if not setting.auto_downgrade_guest_card or invitation_protected then
      update public.event_pledges set guest_eligibility_status='needs_review' where id=pledge.id;
      insert into public.finance_audit_logs(event_id,pledge_id,actor_type,actor_user_id,action,metadata)
      values(pledge.event_id,pledge.id,case when auth.uid() is null then 'system' else 'authenticated_user' end,
        auth.uid(),'contributor_guest_card_downgrade_requested',
        jsonb_build_object('guest_id',linked.id,'old_allowed_guests',old_allowed,'requested_allowed_guests',desired,
          'protected',invitation_protected,'source',left(sync_source,40)));
      return jsonb_build_object('status','needs_review','basisAmount',basis_amount,'guestId',linked.id);
    end if;
    update public.guests set allowed_guests=desired where id=linked.id;
  else
    update public.guests set full_name=pledge.full_name,
      phone=coalesce(nullif(pledge.phone,''),phone),email=coalesce(nullif(pledge.email,''),email)
    where id=linked.id;
  end if;
  result_label := case when desired=2 then 'double' else 'single' end;
  update public.event_pledges set guest_eligibility_status=result_label where id=pledge.id;
  return jsonb_build_object('status',result_label,'basisAmount',basis_amount,'guestId',linked.id,
    'allowedGuests',desired,'created',new_guest);
exception when others then
  if pledge.id is not null then
    update public.event_pledges set guest_eligibility_status='sync_failed' where id=pledge.id;
  end if;
  raise;
end;
$$;

revoke all on function public.sync_contributor_guest(bigint,text) from public, anon;
grant execute on function public.sync_contributor_guest(bigint,text) to authenticated;
