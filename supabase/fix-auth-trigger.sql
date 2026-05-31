-- Hotfix para o erro:
-- {"code":"unexpected_failure","message":"Database error saving new user"}
--
-- Executar no SQL Editor do Supabase.
-- Remove o trigger que fazia raise em auth.users e substitui a criacao de
-- perfil por uma versao tolerante. A restricao @etap.pt continua aplicada por:
-- 1) validacao no frontend,
-- 2) check constraint em profiles,
-- 3) RLS via public.is_etap_user().

create or replace function public.is_etap_email(email text)
returns boolean
language sql
immutable
as $$
  select email is not null and right(lower(email), 8) = '@etap.pt';
$$;

create or replace function public.is_etap_user()
returns boolean
language sql
stable
as $$
  select public.is_etap_email(auth.jwt() ->> 'email');
$$;

drop trigger if exists enforce_etap_auth_user on auth.users;
drop function if exists public.enforce_etap_auth_user();

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_etap_email(new.email) then
    return new;
  end if;

  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile on auth.users;
create trigger on_auth_user_profile
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_auth_user_profile();

insert into public.profiles (id, email, full_name, avatar_url)
select
  id,
  lower(email),
  coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1)),
  raw_user_meta_data ->> 'avatar_url'
from auth.users
where public.is_etap_email(email)
on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
      updated_at = now();
