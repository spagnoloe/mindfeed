-- Editing and deleting Stacks.
--
-- Row-level security limits updates to the user's own Stacks, and the column
-- grant to the name and description, so a Stack can't change hands or age.

create policy "Users can update their own Stacks" on public.stacks
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke update on public.stacks from authenticated;
grant update (name, description) on public.stacks to authenticated;

-- Deleting Stacks. Their stack_ideas rows go with them (on delete cascade);
-- the Ideas themselves, and the user's Likes of them, stay.
create policy "Users can delete their own Stacks" on public.stacks
  for delete to authenticated using (user_id = (select auth.uid()));
