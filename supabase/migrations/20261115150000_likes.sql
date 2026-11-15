-- Likes: the Ideas each user has liked, which make up their Liked Ideas.
--
-- Row-level security limits every user to their own rows. A Like is either
-- there or not, so there is no update policy: liking inserts a row, unliking
-- deletes it. created_at orders Liked Ideas, newest first.

create table public.likes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  idea_id uuid not null references public.ideas (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, idea_id)
);

create index likes_user_id_created_at_idx on public.likes (user_id, created_at desc);

alter table public.likes enable row level security;

create policy "Users can read their own Likes" on public.likes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users can add their own Likes" on public.likes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users can remove their own Likes" on public.likes
  for delete to authenticated using (user_id = (select auth.uid()));
