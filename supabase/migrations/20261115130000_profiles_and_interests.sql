-- Per-user data for accounts and onboarding: each user's profile and Interests.
--
-- Row-level security limits every user to their own rows. Clients can't write
-- interests rows directly (there are no insert or delete policies):
-- set_interests replaces them in one transaction and enforces the minimum of 3.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  bio text not null default ''
);

create table public.interests (
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references public.topics (id),
  primary key (user_id, topic_id)
);

alter table public.profiles enable row level security;
alter table public.interests enable row level security;

create policy "Users can read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Users can read their own Interests" on public.interests
  for select to authenticated using (user_id = (select auth.uid()));

-- A profile for every new account, named from the sign-up metadata ({ name }).
create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- Replaces the caller's Interests with topic_ids. It runs with the owner's
-- rights, since clients have no write policies, and only ever touches the
-- caller's own rows (auth.uid()). Raises, changing nothing, with fewer than 3.
create function public.set_interests(topic_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if cardinality(array(select distinct unnest(topic_ids))) < 3 then
    raise exception 'Pick at least 3 Interests' using errcode = '22023';
  end if;
  delete from public.interests where user_id = auth.uid();
  insert into public.interests (user_id, topic_id)
    select auth.uid(), t from (select distinct unnest(topic_ids) as t) as picked;
end;
$$;
