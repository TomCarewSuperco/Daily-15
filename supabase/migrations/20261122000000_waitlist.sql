-- Launch waiting list from the public /join page. Anyone can add an email with
-- consent; nobody can read the list through the API (it is exported from the
-- dashboard by the team).
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  consent boolean not null,
  source text,
  created_at timestamptz not null default now(),
  constraint waitlist_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  constraint waitlist_consent check (consent),
  constraint waitlist_source_length check (source is null or length(source) <= 64)
);

create unique index waitlist_email_unique on public.waitlist (lower(email));

comment on table public.waitlist is 'Launch waiting list. Insert-only for clients; read from the dashboard.';

alter table public.waitlist enable row level security;

create policy "Anyone can join the waiting list"
  on public.waitlist for insert
  to anon, authenticated
  with check (consent and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
-- No select, update or delete policies: the list can't be read or changed through the API.
