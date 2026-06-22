-- ETAP Biblioteca — Admin & Roles migration
-- Executar no SQL Editor do Supabase, DEPOIS de schema.sql.
--
-- Este script:
--   * Introduz a tabela `invites` (allowlist para Gmail/outras contas externas);
--   * Substitui o modelo "@etap.pt only" por um modelo baseado em roles:
--       - Emails @etap.pt continuam a criar perfil automaticamente (member ou role convidado);
--       - Emails externos (ex: @gmail.com) so criam perfil se existir um invite ativo;
--   * Relaxa as politicas RLS para que teachers possam gerir documentos de members;
--   * Adiciona RPCs grant_role() e revoke_invite() chamadas pelo frontend;
--   * Faz bootstrap do admin institucional (devtest@etap.pt).
--
-- Idempotente: pode ser re-executado com seguranca.

-- ────────────────────────────────────────────────────────────────────────────
-- 0. Helpers existentes (re-criados por seguranca)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.is_etap_email(email text)
returns boolean
language sql
immutable
as $$
  select email is not null and right(lower(email), 8) = '@etap.pt';
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Tabela de invites (allowlist de emails externos)
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.invites (
  email       text primary key,
  role        text not null default 'member'
              check (role in ('member', 'teacher', 'admin')),
  granted_by  uuid references public.profiles(id) on delete set null,
  granted_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Remover a restricao @etap.pt do email dos profiles
--    (agora aceita qualquer email, desde que haja invite ou seja @etap.pt)
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles drop constraint if exists profiles_etap_email;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Funcoes de seguranca (SECURITY DEFINER para evitar recursao de RLS)
-- ────────────────────────────────────────────────────────────────────────────

-- Verdadeiro se o utilizador autenticado tem perfil (ou seja, e membro valido).
-- Substitui is_etap_user() em todas as politicas de LEITURA de conteudo.
create or replace function public.is_library_member()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
  );
$$;

-- Papel (role) do utilizador autenticado. NULL se nao tiver perfil.
create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

-- O chamador pode gerir um documento cujo dono e `owner_uuid`?
--   * dono do documento, OU
--   * admin (gere tudo), OU
--   * teacher E o dono e member (nao gere docs de outros teachers/admins).
create or replace function public.can_manage_document(owner_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      owner_uuid = auth.uid()
      or public.current_role() = 'admin'
      or (
        public.current_role() = 'teacher'
        and exists (
          select 1 from public.profiles owner
          where owner.id = owner_uuid
            and owner.role = 'member'
        )
      )
    );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Trigger de criacao de perfil no registo/login
--    @etap.pt  -> perfil criado sempre (member ou role do invite, se houver)
--    outros    -> perfil criado APENAS se existir invite ativo
--                 (sem invite => sem perfil => RLS bloqueia todo o conteudo)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text := lower(new.email);
  v_role    text;
  v_invited boolean;
begin
  if public.is_etap_email(v_email) then
    -- Utilizador institucional: usa o role do invite se existir, senao 'member'.
    select role into v_role
    from public.invites
    where email = v_email;
    if v_role is null then
      v_role := 'member';
    end if;

    insert into public.profiles (id, email, full_name, avatar_url, role)
    values (
      new.id,
      v_email,
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(v_email, '@', 1)),
      new.raw_user_meta_data ->> 'avatar_url',
      v_role
    )
    on conflict (id) do update
      set email       = excluded.email,
          full_name   = coalesce(excluded.full_name, public.profiles.full_name),
          avatar_url  = coalesce(excluded.avatar_url, public.profiles.avatar_url),
          -- Nao rebaixar um admin/teacher existente se o invite foi removido.
          role        = case
            when public.profiles.role in ('teacher', 'admin')
              then public.profiles.role
            else coalesce(v_role, public.profiles.role)
          end,
          updated_at  = now();
    return new;
  end if;

  -- Email externo (ex: @gmail.com): precisa de invite.
  select true into v_invited
  from public.invites
  where email = v_email;

  if not v_invited then
    -- Sem invite: nao cria perfil. O utilizador autentica-se mas nao ve conteudo.
    return new;
  end if;

  select role into v_role
  from public.invites
  where email = v_email;
  if v_role is null then
    v_role := 'member';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    v_email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(v_email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    v_role
  )
  on conflict (id) do update
    set email       = excluded.email,
        full_name   = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url  = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        role        = coalesce(v_role, public.profiles.role),
        updated_at  = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile on auth.users;
create trigger on_auth_user_profile
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_auth_user_profile();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. RPCs chamados pelo frontend
-- ────────────────────────────────────────────────────────────────────────────

-- Conceder / alterar o role de um email.
--   * Caller tem de ser teacher ou admin.
--   * Cria/atualiza o invite; se o perfil existir, atualiza tambem o role la.
--   * Admins podem conceder qualquer role. Teachers tambem (podem formar novos
--     teachers/admins conforme requisito), mas o proprio backend valida o caller.
create or replace function public.grant_role(p_email text, p_role text)
returns public.invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_role  text := lower(trim(p_role));
  v_caller_role text;
  result public.invites;
begin
  -- Validar role
  if v_role not in ('member', 'teacher', 'admin') then
    raise exception 'Role invalido: %', p_role;
  end if;

  -- Validar email
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email invalido.';
  end if;

  -- Autorizacao: so teacher/admin
  v_caller_role := public.current_role();
  if v_caller_role is null or v_caller_role = 'member' then
    raise exception 'Sem permissao para conceder acessos.';
  end if;

  -- Upsert do invite
  insert into public.invites (email, role, granted_by, granted_at)
  values (v_email, v_role, auth.uid(), now())
  on conflict (email) do update
    set role       = excluded.role,
        granted_by = excluded.granted_by,
        granted_at = now()
  returning * into result;

  -- Se o perfil ja existir, refletir o novo role imediatamente.
  update public.profiles
  set role = v_role, updated_at = now()
  where email = v_email;

  return result;
end;
$$;

-- Remover um invite pendente (NAO altera perfis ja existentes — nao destrutivo).
create or replace function public.revoke_invite(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_caller_role text;
begin
  v_caller_role := public.current_role();
  if v_caller_role is null or v_caller_role = 'member' then
    raise exception 'Sem permissao para revogar acessos.';
  end if;

  delete from public.invites where email = v_email;
end;
$$;

grant execute on function public.grant_role(text, text) to authenticated;
grant execute on function public.revoke_invite(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Politicas RLS (idempotentes)
-- ────────────────────────────────────────────────────────────────────────────

-- profiles: leitura entre membros; insercao so via trigger; update so da propria linha.
drop policy if exists "profiles_select_members" on public.profiles;
create policy "profiles_select_members"
on public.profiles
for select
to authenticated
using (public.is_library_member());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (false); -- todas as insercoes sao feitas pelo trigger SECURITY DEFINER

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid()); -- role so muda via grant_role()

-- categories: leitura para membros
drop policy if exists "categories_select_members" on public.categories;
create policy "categories_select_members"
on public.categories
for select
to authenticated
using (public.is_library_member());

-- documents: leitura para membros
drop policy if exists "documents_select_members" on public.documents;
create policy "documents_select_members"
on public.documents
for select
to authenticated
using (public.is_library_member());

-- documents: insercao so pelo proprio (path-prefix = uid)
drop policy if exists "documents_insert_owner" on public.documents;
create policy "documents_insert_owner"
on public.documents
for insert
to authenticated
with check (
  public.is_library_member()
  and owner_id = auth.uid()
  and split_part(file_path, '/', 1) = auth.uid()::text
);

-- documents: update via can_manage_document(owner_id)
drop policy if exists "documents_update_manage" on public.documents;
create policy "documents_update_manage"
on public.documents
for update
to authenticated
using (public.can_manage_document(owner_id))
with check (public.can_manage_document(owner_id));

-- documents: delete via can_manage_document(owner_id)
drop policy if exists "documents_delete_manage" on public.documents;
create policy "documents_delete_manage"
on public.documents
for delete
to authenticated
using (public.can_manage_document(owner_id));

-- invites: leitura para membros (a UI mostra convites pendentes);
--            insert/update/delete apenas via grant_role()/revoke_invite() RPCs.
drop policy if exists "invites_select_members" on public.invites;
create policy "invites_select_members"
on public.invites
for select
to authenticated
using (public.is_library_member());

drop policy if exists "invites_no_direct_write" on public.invites;
create policy "invites_no_direct_write"
on public.invites
for insert
to authenticated
with check (false);

-- storage.objects (bucket biblioteca)
--   leitura: membros
--   insercao: membro, na sua propria pasta (uid/)
--   update/delete: can_manage_document(dono da pasta)
drop policy if exists "storage_biblioteca_select_members" on storage.objects;
create policy "storage_biblioteca_select_members"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'biblioteca'
  and public.is_library_member()
);

drop policy if exists "storage_biblioteca_insert_owner" on storage.objects;
create policy "storage_biblioteca_insert_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'biblioteca'
  and public.is_library_member()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_biblioteca_update_manage" on storage.objects;
create policy "storage_biblioteca_update_manage"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'biblioteca'
  and public.can_manage_document((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'biblioteca'
  and public.is_library_member()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_biblioteca_delete_manage" on storage.objects;
create policy "storage_biblioteca_delete_manage"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'biblioteca'
  and public.can_manage_document((storage.foldername(name))[1]::uuid)
);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Grants
-- ────────────────────────────────────────────────────────────────────────────

grant select on public.invites to authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.categories to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.documents to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Bootstrap — admin institucional
-- ────────────────────────────────────────────────────────────────────────────

-- Garante o invite admin para devtest@etap.pt
insert into public.invites (email, role)
values ('devtest@etap.pt', 'admin')
on conflict (email) do update
  set role = 'admin';

-- Se o utilizador devtest@etap.pt ja existir em profiles, promove-o a admin.
-- (Descomente/execute conforme necessario.)
-- update public.profiles set role = 'admin', updated_at = now()
-- where email = 'devtest@etap.pt';
