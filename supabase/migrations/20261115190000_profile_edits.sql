-- Editing the profile.
--
-- The column grant limits updates to the name and bio, so a profile can't
-- change hands. A blank name is turned down by the app's Backend rather than
-- here: a check would also reject accounts created without a name, which
-- sign-up's trigger stores as ''.

revoke update on public.profiles from authenticated;
grant update (name, bio) on public.profiles to authenticated;
