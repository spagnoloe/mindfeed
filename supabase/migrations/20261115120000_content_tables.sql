-- Content tables: Topics, Books and Ideas. Rows come from the content package
-- (packages/content) through the generated supabase/seed.sql; ids are the
-- package's stored UUIDs, so there are no defaults.
--
-- Any signed-in user can read them. No client can write them: RLS is on and
-- there are no insert, update or delete policies.

create table public.topics (
  id uuid primary key,
  name text not null,
  hue smallint not null check (hue between 0 and 359),
  -- Position among the Trending topics (1 first), or null when not trending.
  trending_order smallint check (trending_order > 0)
);

create table public.books (
  id uuid primary key,
  title text not null,
  author text not null,
  isbn text not null,
  -- Background hue shown when the Open Library cover is missing.
  cover_hue smallint not null check (cover_hue between 0 and 359)
);

create table public.ideas (
  id uuid primary key,
  book_id uuid not null references public.books (id),
  topic_id uuid not null references public.topics (id),
  title text not null,
  explanation text not null
);

create index ideas_book_id_idx on public.ideas (book_id);
create index ideas_topic_id_idx on public.ideas (topic_id);

alter table public.topics enable row level security;
alter table public.books enable row level security;
alter table public.ideas enable row level security;

create policy "Signed-in users can read Topics" on public.topics for select to authenticated using (true);
create policy "Signed-in users can read Books" on public.books for select to authenticated using (true);
create policy "Signed-in users can read Ideas" on public.ideas for select to authenticated using (true);
