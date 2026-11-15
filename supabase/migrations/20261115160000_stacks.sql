-- Stacks: user-created, named collections of Ideas, and the Ideas in each.
--
-- Row-level security limits every user to their own Stacks, and to the
-- stack_ideas rows of those Stacks. created_at orders Stacks newest first;
-- added_at picks a Stack's first Idea, whose Topic tints the Stack's icon.

create table public.stacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  created_at timestamptz not null default now()
);

create index stacks_user_id_created_at_idx on public.stacks (user_id, created_at desc);

create table public.stack_ideas (
  stack_id uuid not null references public.stacks (id) on delete cascade,
  idea_id uuid not null references public.ideas (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (stack_id, idea_id)
);

create index stack_ideas_idea_id_idx on public.stack_ideas (idea_id);

alter table public.stacks enable row level security;
alter table public.stack_ideas enable row level security;

create policy "Users can read their own Stacks" on public.stacks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users can create their own Stacks" on public.stacks
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Whether the Stack belongs to the signed-in user. Security definer, so the
-- stack_ideas policies can ask without depending on the stacks policies.
create function public.owns_stack(target uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.stacks where id = target and user_id = (select auth.uid()));
$$;

create policy "Users can read their own Stacks' Ideas" on public.stack_ideas
  for select to authenticated using ((select public.owns_stack(stack_id)));
create policy "Users can add Ideas to their own Stacks" on public.stack_ideas
  for insert to authenticated with check ((select public.owns_stack(stack_id)));
create policy "Users can remove Ideas from their own Stacks" on public.stack_ideas
  for delete to authenticated using ((select public.owns_stack(stack_id)));

-- Each of the user's Stacks with its Idea count and its first Idea's Topic.
-- Security invoker, so the policies above still apply.
create view public.stack_summaries with (security_invoker = true) as
select
  s.id,
  s.name,
  s.description,
  s.created_at,
  (select count(*) from public.stack_ideas si where si.stack_id = s.id)::int as idea_count,
  first_topic.id as first_topic_id,
  first_topic.name as first_topic_name,
  first_topic.hue as first_topic_hue
from public.stacks s
left join lateral (
  select t.id, t.name, t.hue
  from public.stack_ideas si
  join public.ideas i on i.id = si.idea_id
  join public.topics t on t.id = i.topic_id
  where si.stack_id = s.id
  order by si.added_at, si.idea_id
  limit 1
) first_topic on true;

-- Creates a Stack for the signed-in user, holding `idea_id` if given, in one
-- transaction. Returns the new Stack's id.
create function public.create_stack(stack_name text, stack_description text default '', idea_id uuid default null)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.stacks (user_id, name, description)
  values ((select auth.uid()), btrim(stack_name), btrim(coalesce(stack_description, '')))
  returning id into new_id;
  if idea_id is not null then
    insert into public.stack_ideas (stack_id, idea_id) values (new_id, create_stack.idea_id);
  end if;
  return new_id;
end;
$$;
