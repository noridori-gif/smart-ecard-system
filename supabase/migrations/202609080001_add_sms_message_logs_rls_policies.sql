-- sms_message_logs (202609070001) shipped with row level security enabled
-- but no policies attached, unlike whatsapp_message_logs which has matching
-- admin-gated INSERT/SELECT/UPDATE policies. RLS with zero policies denies
-- everything by default, so every SMS send since that migration has had its
-- log insert silently fail (app/api/sms/send-invitation/route.ts only warns
-- on that failure, it doesn't block the actual BEEM send), and the
-- invitations page's SMS badge lookup was silently swallowing the resulting
-- select error and always reporting "not sent". Confirmed on the live
-- database: sms_message_logs had 0 rows despite organizers successfully
-- sending SMS invitations. Mirrors whatsapp_message_logs's policies exactly.
create policy "Admins can create SMS logs"
  on public.sms_message_logs
  for insert
  to authenticated
  with check (is_admin());

create policy "Admins can view SMS logs"
  on public.sms_message_logs
  for select
  to authenticated
  using (is_admin());

create policy "Admins can update SMS logs"
  on public.sms_message_logs
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());
