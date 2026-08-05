-- Make pledge reminder idempotency usable as a PostgREST ON CONFLICT target.
-- Forward-only. Deliberately not applied automatically.

begin;

lock table public.pledge_reminders in share row exclusive mode;

do $$
begin
  if exists (
    select 1
    from public.pledge_reminders
    where idempotency_key is not null
    group by idempotency_key
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Migration aborted: public.pledge_reminders contains duplicate non-null idempotency_key values.';
  end if;
end
$$;

drop index if exists public.pledge_reminders_idempotency;

create unique index pledge_reminders_idempotency
  on public.pledge_reminders (idempotency_key);

commit;
