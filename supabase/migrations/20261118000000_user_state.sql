-- One row per user holding their DAILY 15 data as a JSON document.
create table public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_state is 'DAILY 15 app data per user. Progress photos are not stored here.';

-- Users can read and write only their own row.
alter table public.user_state enable row level security;

create policy "Users read their own data"
  on public.user_state for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own data"
  on public.user_state for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own data"
  on public.user_state for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Deletion happens through the delete-account function, which removes the
-- auth user and cascades here. No delete policy is granted to clients.

-- Server sets the timestamp so device clocks can't affect sync ordering.
create or replace function public.touch_user_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_state_touch
  before insert or update on public.user_state
  for each row execute function public.touch_user_state();

-- Cap a single document at 5 MB to stop runaway writes.
alter table public.user_state
  add constraint user_state_size check (pg_column_size(data) < 5 * 1024 * 1024);
