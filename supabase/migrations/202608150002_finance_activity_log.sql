-- Event-wide Activity Log (Financial Suite -> Reports) reads directly from
-- finance_audit_logs, resolving actor + contributor display names server-side
-- (same pattern as get_closing_report_payments: left join profiles, fall back
-- to a generic label when the row has no authenticated actor).
--
-- v1 scope is deliberately a fixed allowlist of ~15 organizer-meaningful
-- action types (pledge/payment/expense CRUD, deletions, imports, cleanup,
-- access links) -- reminder-scheduling, automation, and contributor-guest
-- sync noise are left out for now, per the "Activity Log" design discussion.
--
-- Keyset-paginated on (created_at, id) descending, matching the existing
-- finance_audit_logs_event_created (event_id, created_at desc) index, so no
-- new index is needed for the base chronological scan.
--
-- pledge_id is nulled out on the audit row itself when a pledge is
-- permanently deleted (see 202608130001), so contributor_name falls back to
-- previous_data/new_data on the caller side for those two actions.
--
-- Forward-only. Deliberately not applied automatically.

create or replace function public.get_finance_activity_log(
  target_event_id bigint,
  cursor_created_at timestamptz default null,
  cursor_id bigint default null,
  page_size int default 30
) returns table (
  id bigint,
  pledge_id bigint,
  payment_id bigint,
  expense_id bigint,
  actor_type text,
  actor_name text,
  action text,
  previous_data jsonb,
  new_data jsonb,
  metadata jsonb,
  created_at timestamptz,
  contributor_name text,
  is_admin_action boolean
)
language plpgsql stable security definer set search_path = public, auth, pg_catalog as $$
begin
  if not public.can_manage_event_finance(target_event_id) then raise exception 'Not authorized'; end if;
  return query
  select
    log.id, log.pledge_id, log.payment_id, log.expense_id, log.actor_type,
    coalesce(
      profile.full_name::text,
      case
        when log.actor_type = 'organiser_link' then 'Committee organiser'
        when log.actor_type = 'system' then 'Automated system'
        else 'Smart Event Pass user'
      end
    ),
    log.action, log.previous_data, log.new_data, log.metadata, log.created_at,
    pledge.full_name,
    log.action in ('pledge_deleted_permanently', 'pledge_deleted_permanently_with_payments')
  from public.finance_audit_logs log
  left join public.profiles profile on profile.id = log.actor_user_id
  left join public.event_pledges pledge on pledge.id = log.pledge_id
  where log.event_id = target_event_id
    and log.action = any(array[
      'pledge_created', 'pledge_updated', 'pledge_cancelled', 'pledge_restored',
      'pledge_deleted_permanently', 'pledge_deleted_permanently_with_payments',
      'payment_recorded', 'payment_voided', 'payment_corrected',
      'expense_recorded', 'expense_corrected', 'expense_voided',
      'pledge_import_completed', 'bulk_contributions_cleanup',
      'organiser_link_created', 'organiser_link_revoked'
    ])
    and (
      cursor_created_at is null
      or (log.created_at, log.id) < (cursor_created_at, cursor_id)
    )
  order by log.created_at desc, log.id desc
  limit page_size;
end;
$$;

revoke all on function public.get_finance_activity_log(bigint, timestamptz, bigint, int) from public;
grant execute on function public.get_finance_activity_log(bigint, timestamptz, bigint, int) to authenticated;
