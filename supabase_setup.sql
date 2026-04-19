create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null default 'Bromine User',
  title text not null default 'Workspace builder',
  avatar_seed text not null default 'BR',
  discoverable boolean not null default true,
  legacy_profile_key text,
  onboarded_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null default '[]',
  accent text not null default '#d89a5b',
  use_case text not null default 'personal',
  created_by uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  role text not null default 'member',
  title text not null default '',
  joined_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  constraint workspace_members_workspace_account_key unique (workspace_id, account_id)
);

create table if not exists public.auth_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  login_code text not null,
  magic_token text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  local_id text not null,
  title text not null default 'Untitled',
  content text not null default '',
  cover_image text not null default '',
  status text not null default 'Draft',
  tags text[] not null default array[]::text[],
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  created_by_account_id uuid not null references public.accounts(id),
  last_edited_by_account_id uuid not null references public.accounts(id),
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_workspace_id_local_id_key unique (workspace_id, local_id)
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

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row
execute function public.set_updated_at();

create table if not exists public.note_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  created_by_account_id uuid references public.accounts(id) on delete set null,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  file_size_bytes integer not null default 0,
  data_base64 text not null,
  source_data_base64 text not null default '',
  highlights_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.note_attachments
  add column if not exists source_data_base64 text not null default '';

alter table public.note_attachments
  add column if not exists highlights_json jsonb not null default '[]'::jsonb;

update public.note_attachments
set source_data_base64 = data_base64
where coalesce(source_data_base64, '') = '';

create index if not exists notes_workspace_id_updated_at_idx on public.notes (workspace_id, updated_at desc);
create index if not exists workspace_members_account_id_idx on public.workspace_members (account_id, joined_at desc);
create index if not exists auth_requests_email_created_at_idx on public.auth_requests (email, created_at desc);
create index if not exists sessions_account_id_idx on public.sessions (account_id, created_at desc);
create index if not exists note_attachments_workspace_id_note_id_created_at_idx on public.note_attachments (workspace_id, note_id, created_at desc);

alter table public.accounts enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.auth_requests enable row level security;
alter table public.sessions enable row level security;
alter table public.notes enable row level security;
alter table public.note_attachments enable row level security;

drop policy if exists "service role manages accounts" on public.accounts;
drop policy if exists "service role manages workspaces" on public.workspaces;
drop policy if exists "service role manages workspace members" on public.workspace_members;
drop policy if exists "service role manages auth requests" on public.auth_requests;
drop policy if exists "service role manages sessions" on public.sessions;
drop policy if exists "service role manages notes" on public.notes;
drop policy if exists "service role manages note attachments" on public.note_attachments;

create policy "service role manages accounts" on public.accounts for all to service_role using (true) with check (true);
create policy "service role manages workspaces" on public.workspaces for all to service_role using (true) with check (true);
create policy "service role manages workspace members" on public.workspace_members for all to service_role using (true) with check (true);
create policy "service role manages auth requests" on public.auth_requests for all to service_role using (true) with check (true);
create policy "service role manages sessions" on public.sessions for all to service_role using (true) with check (true);
create policy "service role manages notes" on public.notes for all to service_role using (true) with check (true);
create policy "service role manages note attachments" on public.note_attachments for all to service_role using (true) with check (true);
