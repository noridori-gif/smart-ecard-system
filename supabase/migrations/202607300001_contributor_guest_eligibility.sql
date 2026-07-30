-- Contributor-to-guest eligibility and synchronization.
-- Deliberately not executed automatically.

create table if not exists public.event_contributor_guest_settings (
  event_id bigint primary key references public.events(id) on delete cascade,
  contributor_guest_sync_enabled boolean not null default false,
  classification_basis text not null default 'paid_amount'
    check (classification_basis in ('paid_amount','pledged_amount')),
  single_card_minimum numeric(18,2) not null default 50000 check (single_card_minimum >= 0),
  double_card_minimum numeric(18,2) not null default 120000 check (double_card_minimum >= 0),
  below_minimum_behavior text not null default 'no_guest'
    check (below_minimum_behavior in ('no_guest','pending_guest')),
  auto_upgrade_guest_card boolean not null default true,
  auto_downgrade_guest_card boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint contributor_guest_threshold_order check (double_card_minimum > single_card_minimum)
);

alter table public.event_contributor_guest_settings enable row level security;
create policy contributor_guest_settings_select on public.event_contributor_guest_settings
  for select to authenticated using (public.can_manage_event_finance(event_id));
revoke insert, update, delete on public.event_contributor_guest_settings from anon, authenticated;
grant select on public.event_contributor_guest_settings to authenticated;

alter table public.event_pledges
  add column if not exists guest_eligibility_status text not null default 'not_linked'
  check (guest_eligibility_status in (
    'not_linked','below_minimum','pending_guest','single','double','needs_review','sync_failed'
  ));
create index if not exists event_pledges_guest_eligibility
  on public.event_pledges(event_id, guest_eligibility_status);

create or replace view public.event_pledge_financial_summary
with (security_invoker = true) as
select
  p.id, p.event_id, p.guest_id, p.full_name, p.phone, p.normalized_phone, p.email,
  p.pledged_amount, p.currency_code, p.notes,
  coalesce(sum(pay.amount) filter (where pay.voided_at is null), 0::numeric) as total_paid,
  greatest(p.pledged_amount - coalesce(sum(pay.amount) filter (where pay.voided_at is null), 0::numeric), 0::numeric) as balance,
  case
    when p.cancelled_at is not null then 'cancelled'
    when coalesce(sum(pay.amount) filter (where pay.voided_at is null), 0::numeric) = 0 then 'pledged'
    when coalesce(sum(pay.amount) filter (where pay.voided_at is null), 0::numeric) < p.pledged_amount then 'partial'
    else 'completed'
  end as calculated_status,
  count(pay.id) filter (where pay.voided_at is null) as payment_count,
  max(pay.created_at) filter (where pay.voided_at is null) as last_payment_at,
  p.cancelled_at, p.cancellation_reason, p.created_at, p.updated_at,
  count(pay.id) as payment_row_count,
  (
    count(pay.id) > 0
    or exists (
      select 1
      from public.finance_receipt_verifications receipt
      join public.pledge_payments receipt_payment on receipt_payment.id = receipt.payment_id
      where receipt_payment.pledge_id = p.id
    )
  ) as has_protected_financial_history,
  p.guest_eligibility_status,
  g.allowed_guests as linked_guest_allowed_guests
from public.event_pledges p
left join public.pledge_payments pay on pay.pledge_id=p.id
left join public.guests g on g.id=p.guest_id and g.event_id=p.event_id
group by p.id,g.allowed_guests;

alter table public.finance_audit_logs drop constraint if exists finance_audit_logs_action_check;
alter table public.finance_audit_logs add constraint finance_audit_logs_action_check check (action in (
  'pledge_created','pledge_updated','pledge_cancelled','pledge_restored','pledge_deleted_permanently',
  'payment_recorded','payment_voided','payment_corrected','reminder_requested','reminder_sent',
  'reminder_failed','organiser_link_created','organiser_link_revoked','pledge_import_completed',
  'pledge_thank_you_requested','bulk_contributions_cleanup',
  'contributor_guest_linked','contributor_guest_created','contributor_guest_card_upgraded',
  'contributor_guest_card_downgrade_requested','contributor_guest_eligibility_lost',
  'contributor_guest_sync_failed'
));

create or replace function public.normalize_tanzanian_mobile(value text)
returns text language plpgsql immutable set search_path = pg_catalog as $$
declare digits text;
begin
  digits := regexp_replace(coalesce(value,''), '[^0-9]', '', 'g');
  if digits like '2550%' then digits := '255' || substr(digits, 5);
  elsif digits like '0%' then digits := '255' || substr(digits, 2);
  elsif digits ~ '^[67][0-9]{8}$' then digits := '255' || digits;
  end if;
  if digits ~ '^255[67][0-9]{8}$' then return digits; end if;
  return null;
end;
$$;

create or replace function public.save_contributor_guest_settings(
  target_event_id bigint, sync_enabled boolean, basis text,
  single_minimum numeric, double_minimum numeric, minimum_behavior text,
  auto_upgrade boolean, auto_downgrade boolean
) returns public.event_contributor_guest_settings
language plpgsql security definer set search_path = public, auth, pg_catalog as $$
declare saved public.event_contributor_guest_settings;
begin
  if not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  if basis not in ('paid_amount','pledged_amount') then raise exception 'Invalid classification basis'; end if;
  if minimum_behavior not in ('no_guest','pending_guest') then raise exception 'Invalid below-minimum behavior'; end if;
  if single_minimum < 0 or double_minimum <= single_minimum then raise exception 'Double minimum must be greater than single minimum'; end if;
  insert into public.event_contributor_guest_settings(
    event_id,contributor_guest_sync_enabled,classification_basis,single_card_minimum,
    double_card_minimum,below_minimum_behavior,auto_upgrade_guest_card,
    auto_downgrade_guest_card,updated_by,updated_at
  ) values (
    target_event_id,sync_enabled,basis,single_minimum,double_minimum,minimum_behavior,
    auto_upgrade,auto_downgrade,auth.uid(),now()
  ) on conflict(event_id) do update set
    contributor_guest_sync_enabled=excluded.contributor_guest_sync_enabled,
    classification_basis=excluded.classification_basis,
    single_card_minimum=excluded.single_card_minimum,
    double_card_minimum=excluded.double_card_minimum,
    below_minimum_behavior=excluded.below_minimum_behavior,
    auto_upgrade_guest_card=excluded.auto_upgrade_guest_card,
    auto_downgrade_guest_card=excluded.auto_downgrade_guest_card,
    updated_by=auth.uid(),updated_at=now()
  returning * into saved;
  if sync_enabled then
    perform public.recalculate_event_contributor_guests(target_event_id,'settings_update');
  end if;
  return saved;
end;
$$;
revoke all on function public.save_contributor_guest_settings(bigint,boolean,text,numeric,numeric,text,boolean,boolean) from public, anon;
grant execute on function public.save_contributor_guest_settings(bigint,boolean,text,numeric,numeric,text,boolean,boolean) to authenticated;

create or replace function public.sync_contributor_guest(
  target_pledge_id bigint, sync_source text default 'automatic'
) returns jsonb
language plpgsql security definer set search_path = public, auth, pg_catalog as $$
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
        pass_id := 'SEP-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,6));
        exit when not exists(select 1 from public.guests where event_pass_id=pass_id);
      end loop;
      insert into public.guests(event_id,full_name,phone,email,category,allowed_guests,status,event_pass_id,qr_token)
      values(pledge.event_id,pledge.full_name,pledge.phone,pledge.email,'Normal',desired,'pending',pass_id,gen_random_uuid()::text)
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

create or replace function public.recalculate_event_contributor_guests(target_event_id bigint, sync_source text default 'manual')
returns jsonb language plpgsql security definer set search_path=public,auth,pg_catalog as $$
declare pledge_id bigint; results jsonb := '[]'::jsonb;
begin
  if not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  for pledge_id in select id from public.event_pledges where event_id=target_event_id and cancelled_at is null loop
    results := results || jsonb_build_array(public.sync_contributor_guest(pledge_id,sync_source));
  end loop;
  return results;
end;
$$;
revoke all on function public.recalculate_event_contributor_guests(bigint,text) from public, anon;
grant execute on function public.recalculate_event_contributor_guests(bigint,text) to authenticated;

create or replace function public.trigger_contributor_guest_recalculation()
returns trigger language plpgsql security definer set search_path=public,auth,pg_catalog as $$
declare target bigint;
begin
  target := case when tg_table_name='pledge_payments' then new.pledge_id else new.id end;
  perform public.sync_contributor_guest(target,tg_table_name);
  return new;
end;
$$;
create trigger sync_guest_after_pledge_change after insert or update of pledged_amount,cancelled_at
  on public.event_pledges for each row execute function public.trigger_contributor_guest_recalculation();
create trigger sync_guest_after_payment_change after insert or update of amount,voided_at
  on public.pledge_payments for each row execute function public.trigger_contributor_guest_recalculation();

create or replace function public.import_event_financial_rows_with_guest_sync(
  target_event_id bigint, import_rows jsonb, include_guests boolean default false,
  create_initial_payments boolean default false, skip_duplicates boolean default true,
  source_file_name text default 'Excel Import'
) returns jsonb language plpgsql security definer set search_path=public,auth,pg_catalog as $$
declare result jsonb;
begin
  result := public.import_event_financial_rows(target_event_id,import_rows,false,
    create_initial_payments,skip_duplicates,source_file_name);
  if include_guests then
    perform public.recalculate_event_contributor_guests(target_event_id,'excel_import');
  end if;
  return result || jsonb_build_object('guestSyncEnabled',include_guests);
end;
$$;
revoke all on function public.import_event_financial_rows_with_guest_sync(bigint,jsonb,boolean,boolean,boolean,text) from public,anon;
grant execute on function public.import_event_financial_rows_with_guest_sync(bigint,jsonb,boolean,boolean,boolean,text) to authenticated;
