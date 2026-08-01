begin;

alter table public.profiles
  add column if not exists authentication_type text not null default 'EMAIL',
  add column if not exists login_email text,
  add column if not exists login_phone text,
  add column if not exists force_password_change boolean not null default false;

alter table public.profiles drop constraint if exists profiles_authentication_type_check;
alter table public.profiles add constraint profiles_authentication_type_check
  check (authentication_type in ('EMAIL', 'PHONE'));

update public.profiles p
set login_email = lower(u.email),
    login_phone = u.phone,
    authentication_type = case when u.phone is not null and u.email is null then 'PHONE' else 'EMAIL' end
from auth.users u
where u.id = p.id
  and p.login_email is null
  and p.login_phone is null;

create unique index if not exists profiles_login_email_unique
  on public.profiles (lower(login_email)) where login_email is not null;
create unique index if not exists profiles_login_phone_unique
  on public.profiles (login_phone) where login_phone is not null;

commit;
