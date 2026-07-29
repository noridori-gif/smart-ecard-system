alter table public.finance_audit_logs
  drop constraint if exists finance_audit_logs_action_check;

alter table public.finance_audit_logs
  add constraint finance_audit_logs_action_check check (action in (
    'pledge_created','pledge_updated','pledge_cancelled','pledge_restored',
    'pledge_deleted_permanently','payment_recorded','payment_voided',
    'payment_corrected','reminder_requested','reminder_sent','reminder_failed',
    'pledge_thank_you_requested','organiser_link_created','organiser_link_revoked',
    'pledge_import_completed','bulk_contributions_cleanup'
  ));
