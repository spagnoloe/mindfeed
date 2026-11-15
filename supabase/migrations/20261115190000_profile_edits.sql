-- Editing the profile.
--
-- A profile always has a name, and the column grant limits updates to the name
-- and bio, so a profile can't change hands.

alter table public.profiles add constraint profiles_name_not_blank check (length(btrim(name)) > 0);

revoke update on public.profiles from authenticated;
grant update (name, bio) on public.profiles to authenticated;
