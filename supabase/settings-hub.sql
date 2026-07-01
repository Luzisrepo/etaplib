-- ETAP Biblioteca — Settings hub migration
-- Executar no SQL Editor do Supabase DEPOIS de schema.sql.
-- Idempotente: pode ser corrido múltiplas vezes em segurança.
--
-- Adiciona tudo o que a nova página de Definições precisa:
--   • Perfil alargado (bio, curso, ano, turma, visibilidade)
--   • Pedido de eliminação de conta
--   • Pesquisas guardadas
--   • Listas de leitura
--   • Sessões / dispositivos
--   • Histórico de login

-- ── Perfil: novas colunas ────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists bio text check (bio is null or char_length(bio) <= 280),
  add column if not exists course text check (course is null or char_length(course) <= 120),
  add column if not exists academic_year text check (academic_year is null or char_length(academic_year) <= 40),
  add column if not exists class_group text check (class_group is null or char_length(class_group) <= 40),
  add column if not exists profile_visibility text not null default 'school'
    check (profile_visibility in ('school', 'staff', 'private')),
  add column if not exists show_reading_history boolean not null default true,
  add column if not exists favorite_category_ids uuid[] not null default '{}'::uuid[],
  add column if not exists default_filters jsonb,
  add column if not exists deletion_requested_at timestamptz;

-- ── Pesquisas guardadas ───────────────────────────────────────────────────────

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  query text not null default '' check (char_length(query) <= 160),
  category_id uuid references public.categories(id) on delete set null,
  tag text check (tag is null or char_length(tag) <= 40),
  created_at timestamptz not null default now()
);

create index if not exists saved_searches_user_id_idx on public.saved_searches(user_id);

-- ── Listas de leitura ─────────────────────────────────────────────────────────

create table if not exists public.reading_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (description is null or char_length(description) <= 240),
  created_at timestamptz not null default now()
);

create index if not exists reading_lists_user_id_idx on public.reading_lists(user_id);

-- ── Sessões / dispositivos ──────────────────────────────────────────────────

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,
  device_label text,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists user_sessions_user_id_idx on public.user_sessions(user_id);

-- ── Histórico de login ────────────────────────────────────────────────────────

create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  device_label text,
  user_agent text
);

create index if not exists login_history_user_id_idx on public.login_history(user_id, occurred_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.saved_searches enable row level security;
alter table public.reading_lists  enable row level security;
alter table public.user_sessions  enable row level security;
alter table public.login_history  enable row level security;

drop policy if exists "saved_searches_owner_all" on public.saved_searches;
create policy "saved_searches_owner_all"
on public.saved_searches
for all
to authenticated
using (user_id = auth.uid() and public.is_etap_user())
with check (user_id = auth.uid() and public.is_etap_user());

drop policy if exists "reading_lists_owner_all" on public.reading_lists;
create policy "reading_lists_owner_all"
on public.reading_lists
for all
to authenticated
using (user_id = auth.uid() and public.is_etap_user())
with check (user_id = auth.uid() and public.is_etap_user());

drop policy if exists "user_sessions_owner_all" on public.user_sessions;
create policy "user_sessions_owner_all"
on public.user_sessions
for all
to authenticated
using (user_id = auth.uid() and public.is_etap_user())
with check (user_id = auth.uid() and public.is_etap_user());

drop policy if exists "login_history_owner_select" on public.login_history;
create policy "login_history_owner_select"
on public.login_history
for select
to authenticated
using (user_id = auth.uid() and public.is_etap_user());

drop policy if exists "login_history_owner_insert" on public.login_history;
create policy "login_history_owner_insert"
on public.login_history
for insert
to authenticated
with check (user_id = auth.uid() and public.is_etap_user());

grant select, insert, update, delete on public.saved_searches to authenticated;
grant select, insert, update, delete on public.reading_lists  to authenticated;
grant select, insert, update, delete on public.user_sessions  to authenticated;
grant select, insert            on public.login_history  to authenticated;
