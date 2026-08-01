begin;

alter table public.profiles drop constraint if exists profiles_authentication_type_check;
alter table public.profiles add constraint profiles_authentication_type_check check(authentication_type in ('EMAIL','PHONE','USERNAME'));
alter table public.profiles add column if not exists login_username text;

create table if not exists public.user_login_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text,
  normalized_username text,
  normalized_phone text,
  real_email text,
  normalized_real_email text,
  internal_auth_email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_login_username_format check (normalized_username is null or normalized_username ~ '^[a-z0-9][a-z0-9._-]{3,29}$'),
  constraint user_login_phone_format check (normalized_phone is null or normalized_phone ~ '^255[67][0-9]{8}$')
);

create unique index if not exists user_login_username_unique on public.user_login_identities(normalized_username) where normalized_username is not null;
create unique index if not exists user_login_phone_unique on public.user_login_identities(normalized_phone) where normalized_phone is not null;
create unique index if not exists user_login_real_email_unique on public.user_login_identities(normalized_real_email) where normalized_real_email is not null;

alter table public.user_login_identities enable row level security;
revoke all on public.user_login_identities from anon, authenticated;

insert into public.user_login_identities(user_id,real_email,normalized_real_email,internal_auth_email)
select u.id,lower(u.email),lower(u.email),lower(u.email)
from auth.users u where u.email is not null
on conflict(user_id) do nothing;

create unique index if not exists profiles_login_username_unique on public.profiles(login_username) where login_username is not null;

commit;
