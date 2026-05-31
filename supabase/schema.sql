-- ETAP Biblioteca Digital
-- Executar no SQL Editor do Supabase.
-- Este script cria tabelas, categorias iniciais, bucket privado e policies RLS.

create extension if not exists pgcrypto;

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_etap_email check (public.is_etap_email(email))
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  color text not null default '#2f81f7' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  description text check (description is null or char_length(description) <= 1200),
  file_name text not null,
  file_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  file_size bigint not null check (file_size > 0),
  tags text[] not null default '{}'::text[],
  search_vector tsvector generated always as (
    to_tsvector(
      'portuguese',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(file_name, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_storage_owner_prefix check (split_part(file_path, '/', 1) = owner_id::text),
  constraint documents_tags_limit check (coalesce(array_length(tags, 1), 0) <= 20)
);

create index if not exists documents_owner_id_idx on public.documents(owner_id);
create index if not exists documents_category_id_idx on public.documents(category_id);
create index if not exists documents_created_at_idx on public.documents(created_at desc);
create index if not exists documents_tags_idx on public.documents using gin(tags);
create index if not exists documents_search_idx on public.documents using gin(search_vector);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

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

insert into public.categories (name, slug, description, color)
values
  ('Programacao', 'programacao', 'Algoritmos, linguagens, frameworks e projetos.', '#2f81f7'),
  ('Redes', 'redes', 'Infraestruturas, protocolos e administracao de sistemas.', '#3fb950'),
  ('Bases de Dados', 'bases-de-dados', 'Modelacao, SQL, Supabase e administracao de dados.', '#a371f7'),
  ('Matematica', 'matematica', 'Apoio a calculo, estatistica e raciocinio logico.', '#d29922'),
  ('Portugues', 'portugues', 'Materiais de comunicacao, escrita e leitura.', '#f85149'),
  ('Ingles', 'ingles', 'Conteudos de lingua inglesa e comunicacao tecnica.', '#79c0ff'),
  ('Projetos', 'projetos', 'Recursos transversais para PAP, projetos e trabalhos.', '#db6d28')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      color = excluded.color;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('biblioteca', 'biblioteca', false, 524288000, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.documents enable row level security;

drop policy if exists "profiles_select_etap" on public.profiles;
create policy "profiles_select_etap"
on public.profiles
for select
to authenticated
using (public.is_etap_user());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and public.is_etap_email(email) and public.is_etap_user());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid() and public.is_etap_user())
with check (id = auth.uid() and public.is_etap_email(email));

drop policy if exists "categories_select_etap" on public.categories;
create policy "categories_select_etap"
on public.categories
for select
to authenticated
using (public.is_etap_user());

drop policy if exists "documents_select_etap" on public.documents;
create policy "documents_select_etap"
on public.documents
for select
to authenticated
using (public.is_etap_user());

drop policy if exists "documents_insert_owner" on public.documents;
create policy "documents_insert_owner"
on public.documents
for insert
to authenticated
with check (
  public.is_etap_user()
  and owner_id = auth.uid()
  and split_part(file_path, '/', 1) = auth.uid()::text
);

drop policy if exists "documents_update_owner" on public.documents;
create policy "documents_update_owner"
on public.documents
for update
to authenticated
using (public.is_etap_user() and owner_id = auth.uid())
with check (
  public.is_etap_user()
  and owner_id = auth.uid()
  and split_part(file_path, '/', 1) = auth.uid()::text
);

drop policy if exists "documents_delete_owner" on public.documents;
create policy "documents_delete_owner"
on public.documents
for delete
to authenticated
using (public.is_etap_user() and owner_id = auth.uid());

drop policy if exists "storage_biblioteca_select_etap" on storage.objects;
create policy "storage_biblioteca_select_etap"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'biblioteca'
  and public.is_etap_user()
);

drop policy if exists "storage_biblioteca_insert_owner" on storage.objects;
create policy "storage_biblioteca_insert_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'biblioteca'
  and public.is_etap_user()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_biblioteca_update_owner" on storage.objects;
create policy "storage_biblioteca_update_owner"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'biblioteca'
  and public.is_etap_user()
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'biblioteca'
  and public.is_etap_user()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_biblioteca_delete_owner" on storage.objects;
create policy "storage_biblioteca_delete_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'biblioteca'
  and public.is_etap_user()
  and (storage.foldername(name))[1] = auth.uid()::text
);

grant usage on schema public to anon, authenticated;
grant select on public.categories to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
