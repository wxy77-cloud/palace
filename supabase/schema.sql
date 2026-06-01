create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page text not null,
  title text not null,
  content text,
  data jsonb not null default '{}'::jsonb,
  edit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists entries_user_page_created_idx
on public.entries (user_id, page, created_at desc);

alter table public.entries enable row level security;

drop policy if exists "Users can read own entries" on public.entries;
create policy "Users can read own entries"
on public.entries for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own entries" on public.entries;
create policy "Users can insert own entries"
on public.entries for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own entries" on public.entries;
create policy "Users can update own entries"
on public.entries for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own entries" on public.entries;
create policy "Users can delete own entries"
on public.entries for delete
using (auth.uid() = user_id);
