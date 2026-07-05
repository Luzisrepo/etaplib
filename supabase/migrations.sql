-- Migration for Teacher/Admin Features

-- 1. Document Expiry Dates
alter table public.documents add column if not exists expiry_date timestamptz;

drop policy if exists "documents_select_members" on public.documents;
create policy "documents_select_members"
on public.documents
for select
to authenticated
using (
  public.is_library_member()
  and (
    expiry_date is null
    or expiry_date > now()
    or public.can_manage_document(owner_id)
  )
);

-- 2. Analytics (Document Downloads)
create table if not exists public.document_downloads (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  downloaded_at timestamptz not null default now()
);

create index if not exists document_downloads_document_id_idx on public.document_downloads(document_id);
create index if not exists document_downloads_downloaded_at_idx on public.document_downloads(downloaded_at desc);

alter table public.document_downloads enable row level security;

-- Any authenticated library member can record a download
drop policy if exists "document_downloads_insert" on public.document_downloads;
create policy "document_downloads_insert"
on public.document_downloads for insert
to authenticated
with check (public.is_library_member());

-- Only staff (teacher/admin) can read analytics data
drop policy if exists "document_downloads_select_staff" on public.document_downloads;
create policy "document_downloads_select_staff"
on public.document_downloads for select
to authenticated
using (public.current_role() in ('teacher', 'admin'));

-- 3. Required Reading Lists
alter table public.reading_lists
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists is_required boolean not null default false;

create index if not exists reading_lists_category_id_idx on public.reading_lists(category_id);

drop policy if exists "reading_lists_owner_all" on public.reading_lists;
drop policy if exists "reading_lists_select" on public.reading_lists;
drop policy if exists "reading_lists_insert" on public.reading_lists;
drop policy if exists "reading_lists_update_delete" on public.reading_lists;

-- Select reading lists: any member
create policy "reading_lists_select"
on public.reading_lists for select
to authenticated
using (public.is_library_member());

-- Insert: member can insert, but only staff can mark as is_required
create policy "reading_lists_insert"
on public.reading_lists for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (public.current_role() in ('teacher', 'admin'))
    or (is_required = false)
  )
);

-- Update/Delete: creator or admin
create policy "reading_lists_update_delete"
on public.reading_lists for all
to authenticated
using (
  user_id = auth.uid()
  or public.current_role() = 'admin'
)
with check (
  user_id = auth.uid()
  or public.current_role() = 'admin'
);

-- 4. Reading List Documents Junction Table
create table if not exists public.reading_list_documents (
  reading_list_id uuid not null references public.reading_lists(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  primary key (reading_list_id, document_id)
);

alter table public.reading_list_documents enable row level security;

drop policy if exists "reading_list_documents_select" on public.reading_list_documents;
create policy "reading_list_documents_select"
on public.reading_list_documents for select
to authenticated
using (public.is_library_member());

drop policy if exists "reading_list_documents_all_owner" on public.reading_list_documents;
create policy "reading_list_documents_all_owner"
on public.reading_list_documents for all
to authenticated
using (
  exists (
    select 1 from public.reading_lists rl
    where rl.id = reading_list_id
      and (rl.user_id = auth.uid() or public.current_role() = 'admin')
  )
);

-- 5. Grants
grant select, insert on public.document_downloads to authenticated;
grant select, insert, update, delete on public.reading_lists to authenticated;
grant select, insert, update, delete on public.reading_list_documents to authenticated;
