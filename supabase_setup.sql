create extension if not exists pgcrypto;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  local_id text not null unique,
  title text not null default 'Untitled',
  content text not null default '',
  cover_image text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

create index if not exists notes_created_at_idx on public.notes (created_at desc);

alter table public.notes enable row level security;

drop policy if exists "anon can read notes" on public.notes;
drop policy if exists "anon can insert notes" on public.notes;
drop policy if exists "anon can update notes" on public.notes;
drop policy if exists "anon can delete notes" on public.notes;

create policy "anon can read notes"
on public.notes
for select
to anon
using (true);

create policy "anon can insert notes"
on public.notes
for insert
to anon
with check (true);

create policy "anon can update notes"
on public.notes
for update
to anon
using (true)
with check (true);

create policy "anon can delete notes"
on public.notes
for delete
to anon
using (true);
